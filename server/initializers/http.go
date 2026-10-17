package initializers

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/config"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
)

// NewGinEngine membuat engine Gin tanpa middleware bawaan; middleware dipasang di app/server.go.
func NewGinEngine(cfg *config.Config) (*gin.Engine, error) {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	bind.UseJSONFieldNames()

	engine := gin.New()
	engine.RedirectTrailingSlash = false

	proxies := cfg.TrustedProxies
	if len(proxies) == 0 {
		proxies = nil
	}
	if err := engine.SetTrustedProxies(proxies); err != nil {
		return nil, fmt.Errorf("failed to set trusted proxies: %w", err)
	}
	return engine, nil
}

// NewHTTPServer membungkus engine dengan timeout dari config.
func NewHTTPServer(cfg *config.Config, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.HTTPPort),
		Handler:           handler,
		ReadTimeout:       cfg.ReadTimeout,
		ReadHeaderTimeout: cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
	}
}

// RunHTTPServer menjalankan server sampai ctx selesai, lalu menyelesaikan request yang sedang
// berjalan (maksimal cfg.ShutdownTimeout).
func RunHTTPServer(ctx context.Context, cfg *config.Config, srv *http.Server) error {
	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("http server started")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("failed to serve http: %w", err)
		}
		return nil
	case <-ctx.Done():
	}

	log.Info().Msg("http server shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("failed to shutdown http server: %w", err)
	}
	return <-errCh
}
