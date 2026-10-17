// Package bind menerjemahkan error binding Gin (c.ShouldBind*) menjadi *apperror.Error. Paket ini
// khusus layer handler; apperror sendiri tetap bebas Gin karena dipakai use case.
package bind

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"

	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

// UseJSONFieldNames membuat error validasi Gin memakai nama field JSON (camelCase), sama dengan
// nama field di form client. Dipanggil sekali saat engine dibuat.
func UseJSONFieldNames() {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return
	}
	v.RegisterTagNameFunc(func(field reflect.StructField) string {
		name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
		if name == "-" {
			return ""
		}
		if name == "" {
			return field.Name
		}
		return name
	})
}

// Error mengubah error dari c.ShouldBind* menjadi *apperror.Error: error validasi menjadi field
// errors, JSON yang rusak atau body yang terlalu besar menjadi BadRequest.
func Error(err error) *apperror.Error {
	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		fields := make([]apperror.FieldError, 0, len(validationErrs))
		for _, fe := range validationErrs {
			fields = append(fields, apperror.FieldError{Field: fieldPath(fe), Message: fieldMessage(fe)})
		}
		return apperror.Validation(fields...)
	}

	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) {
		return apperror.BadRequest("Ukuran data yang dikirim melebihi batas.").WithCause(err)
	}

	var syntaxErr *json.SyntaxError
	var typeErr *json.UnmarshalTypeError
	switch {
	case errors.Is(err, io.EOF):
		return apperror.BadRequest("Body request kosong.").WithCause(err)
	case errors.As(err, &typeErr):
		field := apperror.FieldError{Field: typeErr.Field, Message: "Tipe data tidak sesuai"}
		return apperror.Validation(field).WithCause(err)
	case errors.As(err, &syntaxErr), errors.Is(err, io.ErrUnexpectedEOF):
		return apperror.BadRequest("Format JSON tidak valid.").WithCause(err)
	default:
		return apperror.BadRequest("Request tidak valid.").WithCause(err)
	}
}

// fieldPath membuang nama struct paling luar: "SubmitRequest.values.designDoc" → "values.designDoc".
func fieldPath(fe validator.FieldError) string {
	_, path, found := strings.Cut(fe.Namespace(), ".")
	if !found {
		return fe.Field()
	}
	return path
}

func fieldMessage(fe validator.FieldError) string {
	param := fe.Param()
	switch fe.Tag() {
	case "required", "required_if", "required_with", "required_without":
		return "Wajib diisi"
	case "email":
		return "Format email tidak valid"
	case "url", "http_url", "uri":
		return "Format URL tidak valid"
	case "uuid", "uuid4":
		return "Format ID tidak valid"
	case "oneof":
		return fmt.Sprintf("Harus salah satu dari: %s", strings.ReplaceAll(param, " ", ", "))
	case "min", "gte":
		return sizeMessage(fe.Kind(), "Minimal", param)
	case "max", "lte":
		return sizeMessage(fe.Kind(), "Maksimal", param)
	case "len":
		return sizeMessage(fe.Kind(), "Harus", param)
	case "gt":
		return fmt.Sprintf("Harus lebih dari %s", param)
	case "lt":
		return fmt.Sprintf("Harus kurang dari %s", param)
	default:
		return "Tidak valid"
	}
}

func sizeMessage(kind reflect.Kind, prefix, param string) string {
	switch kind {
	case reflect.String:
		return fmt.Sprintf("%s %s karakter", prefix, param)
	case reflect.Slice, reflect.Array, reflect.Map:
		return fmt.Sprintf("%s %s item", prefix, param)
	default:
		return fmt.Sprintf("%s %s", prefix, param)
	}
}
