// Package storage membungkus Cloudflare R2 lewat S3 API (AWS SDK v2). Bucket bersifat private;
// browser mengunggah langsung lewat presigned URL dan server memeriksa hasilnya dengan HeadObject.
package storage

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	smithyhttp "github.com/aws/smithy-go/transport/http"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
)

// Config adalah kredensial dan bucket R2.
type Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
}

// R2 mengimplementasikan coreRepo.Storage.
type R2 struct {
	client  *s3.Client
	presign *s3.PresignClient
	bucket  string
}

// NewR2 membuat client R2. Endpoint disusun dari account ID dan region selalu "auto".
func NewR2(cfg Config) *R2 {
	client := s3.New(s3.Options{
		Region:       "auto",
		BaseEndpoint: aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)),
		Credentials:  credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		// Checksum bawaan SDK ikut ditandatangani di presigned URL, padahal browser tidak
		// mengirimnya. Hanya dihitung bila operasi memang mewajibkan.
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired,
	})
	return &R2{client: client, presign: s3.NewPresignClient(client), bucket: cfg.Bucket}
}

// PresignUpload membuat URL PUT. Content-Type dan Content-Length ikut ditandatangani, jadi R2
// menolak berkas dengan tipe atau ukuran lain.
func (s *R2) PresignUpload(ctx context.Context, key, contentType string, sizeBytes int64, ttl time.Duration) (entity.PresignedUpload, error) {
	request, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(key),
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(sizeBytes),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return entity.PresignedUpload{}, fmt.Errorf("failed to presign upload: %w", err)
	}
	return entity.PresignedUpload{
		URL:       request.URL,
		Headers:   browserHeaders(request.SignedHeader),
		ExpiresAt: time.Now().Add(ttl).UTC(),
	}, nil
}

// HeadObject membaca ukuran dan content type object.
func (s *R2) HeadObject(ctx context.Context, key string) (entity.StoredObject, error) {
	output, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	if isNotFound(err) {
		return entity.StoredObject{}, coreErrors.ErrObjectNotFound
	}
	if err != nil {
		return entity.StoredObject{}, fmt.Errorf("failed to head object: %w", err)
	}
	return entity.StoredObject{SizeBytes: aws.ToInt64(output.ContentLength), ContentType: aws.ToString(output.ContentType)}, nil
}

// DeleteObject menghapus object. S3 API tidak mengembalikan error untuk key yang tidak ada.
func (s *R2) DeleteObject(ctx context.Context, key string) error {
	if _, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)}); err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}
	return nil
}

// browserHeaders mengambil header bertanda tangan yang harus dikirim browser. Host dan
// Content-Length diisi browser sendiri dan tidak boleh di-set lewat JavaScript.
func browserHeaders(signed http.Header) map[string]string {
	headers := make(map[string]string, len(signed))
	for name, values := range signed {
		switch strings.ToLower(name) {
		case "host", "content-length":
			continue
		}
		if len(values) > 0 {
			headers[name] = values[0]
		}
	}
	return headers
}

func isNotFound(err error) bool {
	var responseErr *smithyhttp.ResponseError
	return errors.As(err, &responseErr) && responseErr.HTTPStatusCode() == http.StatusNotFound
}

// Disabled dipakai bila kredensial R2 belum diisi: setiap operasi mengembalikan
// coreErrors.ErrStorageDisabled.
type Disabled struct{}

// PresignUpload mengimplementasikan coreRepo.Storage.
func (Disabled) PresignUpload(context.Context, string, string, int64, time.Duration) (entity.PresignedUpload, error) {
	return entity.PresignedUpload{}, coreErrors.ErrStorageDisabled
}

// HeadObject mengimplementasikan coreRepo.Storage.
func (Disabled) HeadObject(context.Context, string) (entity.StoredObject, error) {
	return entity.StoredObject{}, coreErrors.ErrStorageDisabled
}

// DeleteObject mengimplementasikan coreRepo.Storage.
func (Disabled) DeleteObject(context.Context, string) error {
	return coreErrors.ErrStorageDisabled
}
