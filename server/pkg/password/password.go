// Package password meng-hash password dengan bcrypt.
package password

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// Cost bcrypt. 12 ≈ 200–300 ms per hash di server biasa: cukup lambat untuk brute force,
// masih nyaman untuk login.
const Cost = 12

// Hasher mengimplementasikan repository.PasswordHasher.
type Hasher struct {
	cost int
}

// NewHasher membuat hasher dengan cost bawaan.
func NewHasher() *Hasher {
	return &Hasher{cost: Cost}
}

// Hash membuat hash bcrypt.
func (h *Hasher) Hash(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), h.cost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// Compare bernilai true bila plain cocok dengan hash.
func (h *Hasher) Compare(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
