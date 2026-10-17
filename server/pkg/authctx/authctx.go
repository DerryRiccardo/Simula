// Package authctx menyimpan user yang sedang login di context request. Diisi middleware Auth,
// dibaca use case.
package authctx

import "context"

// User adalah identitas minimal user yang sedang login.
type User struct {
	ID   string
	Role string
}

type ctxKey struct{}

// WithUser menaruh user di context.
func WithUser(ctx context.Context, user User) context.Context {
	return context.WithValue(ctx, ctxKey{}, user)
}

// UserFrom mengambil user dari context. ok bernilai false bila request tidak login.
func UserFrom(ctx context.Context) (User, bool) {
	user, ok := ctx.Value(ctxKey{}).(User)
	return user, ok
}
