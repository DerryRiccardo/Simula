// Package response menulis envelope JSON yang dibaca client: { success, message, data } untuk
// sukses dan { success: false, message, errors } untuk error.
package response

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

const (
	msgOK      = "Berhasil"
	msgCreated = "Berhasil dibuat"
)

// Envelope adalah bentuk respons sukses (IApiResponse<T> di client).
type Envelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// ErrorEnvelope adalah bentuk respons error. Errors selalu berupa array, tidak pernah null.
type ErrorEnvelope struct {
	Success bool                  `json:"success"`
	Message string                `json:"message"`
	Errors  []apperror.FieldError `json:"errors"`
}

// OK menulis respons 200.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Envelope{Success: true, Message: msgOK, Data: data})
}

// Created menulis respons 201.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, Envelope{Success: true, Message: msgCreated, Data: data})
}

// Write menulis envelope dengan status dan pesan tertentu. success = status < 400.
func Write(c *gin.Context, status int, message string, data any) {
	c.JSON(status, Envelope{Success: status < http.StatusBadRequest, Message: message, Data: data})
}

// Error menulis respons error dari *apperror.Error.
func Error(c *gin.Context, err *apperror.Error) {
	fields := err.Fields
	if fields == nil {
		fields = []apperror.FieldError{}
	}
	c.JSON(err.HTTPStatus(), ErrorEnvelope{Success: false, Message: err.Message, Errors: fields})
}
