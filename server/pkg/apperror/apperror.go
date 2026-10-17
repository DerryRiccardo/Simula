// Package apperror adalah tipe error yang dikembalikan use case. Middleware error memetakannya ke
// status HTTP dan envelope respons; handler hanya meneruskannya lewat c.Error.
package apperror

import (
	"errors"
	"net/http"
)

// Kind menentukan status HTTP dari sebuah error.
type Kind string

const (
	KindValidation      Kind = "validation"
	KindBadRequest      Kind = "bad_request"
	KindUnauthenticated Kind = "unauthenticated"
	KindForbidden       Kind = "forbidden"
	KindNotFound        Kind = "not_found"
	KindConflict        Kind = "conflict"
	KindTooManyRequests Kind = "too_many_requests"
	KindInternal        Kind = "internal"
)

// Pesan bawaan untuk user (ditampilkan client sebagai toast).
const (
	MsgValidation      = "Data yang dikirim belum valid."
	MsgUnauthenticated = "Sesi kamu sudah berakhir. Silakan masuk lagi."
	MsgForbidden       = "Kamu tidak punya akses ke halaman ini."
	MsgNotFound        = "Data tidak ditemukan."
	MsgTooManyRequests = "Terlalu banyak permintaan. Coba lagi sebentar lagi."
	MsgInternal        = "Terjadi kesalahan pada server. Coba lagi nanti."
)

// FieldError adalah error validasi untuk satu field form. Field memakai nama JSON di client.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error adalah error aplikasi dengan pesan yang aman ditampilkan ke user. Cause hanya untuk log.
type Error struct {
	Kind    Kind
	Message string
	Fields  []FieldError
	cause   error
}

func (e *Error) Error() string {
	if e.cause != nil {
		return string(e.Kind) + ": " + e.Message + ": " + e.cause.Error()
	}
	return string(e.Kind) + ": " + e.Message
}

func (e *Error) Unwrap() error {
	return e.cause
}

// HTTPStatus memetakan Kind ke status HTTP.
func (e *Error) HTTPStatus() int {
	switch e.Kind {
	case KindValidation:
		return http.StatusUnprocessableEntity
	case KindBadRequest:
		return http.StatusBadRequest
	case KindUnauthenticated:
		return http.StatusUnauthorized
	case KindForbidden:
		return http.StatusForbidden
	case KindNotFound:
		return http.StatusNotFound
	case KindConflict:
		return http.StatusConflict
	case KindTooManyRequests:
		return http.StatusTooManyRequests
	default:
		return http.StatusInternalServerError
	}
}

// WithCause menyimpan error asal untuk log tanpa mengubah pesan untuk user.
func (e *Error) WithCause(cause error) *Error {
	e.cause = cause
	return e
}

// Validation dipakai saat satu atau lebih field tidak valid.
func Validation(fields ...FieldError) *Error {
	return &Error{Kind: KindValidation, Message: MsgValidation, Fields: fields}
}

// BadRequest dipakai saat request tidak bisa dibaca (JSON rusak, parameter tidak dikenal).
func BadRequest(message string) *Error {
	return &Error{Kind: KindBadRequest, Message: message}
}

// Unauthenticated dipakai saat sesi tidak ada atau sudah kedaluwarsa.
func Unauthenticated() *Error {
	return &Error{Kind: KindUnauthenticated, Message: MsgUnauthenticated}
}

// Forbidden dipakai saat peran user tidak boleh mengakses endpoint.
func Forbidden() *Error {
	return &Error{Kind: KindForbidden, Message: MsgForbidden}
}

// NotFound dipakai saat data tidak ada atau bukan milik user.
func NotFound(message string) *Error {
	if message == "" {
		message = MsgNotFound
	}
	return &Error{Kind: KindNotFound, Message: message}
}

// Conflict dipakai saat aksi bertentangan dengan state data (status, batas revisi, duplikat).
func Conflict(message string) *Error {
	return &Error{Kind: KindConflict, Message: message}
}

// TooManyRequests dipakai untuk rate limit.
func TooManyRequests() *Error {
	return &Error{Kind: KindTooManyRequests, Message: MsgTooManyRequests}
}

// Internal membungkus error tak terduga. Client hanya menerima pesan umum; cause dicatat di log.
func Internal(cause error) *Error {
	return &Error{Kind: KindInternal, Message: MsgInternal, cause: cause}
}

// From mengubah error apa pun menjadi *Error. Error yang bukan *Error dianggap Internal.
func From(err error) *Error {
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr
	}
	return Internal(err)
}
