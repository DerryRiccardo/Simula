-- +migrate Up

-- Menambahkan metode pembayaran e-wallet (OVO, DANA, ShopeePay) pada tabel orders.
ALTER TABLE orders DROP CONSTRAINT orders_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_method_check CHECK (
    method IN ('va_bca', 'va_mandiri', 'va_bni', 'qris', 'gopay', 'ovo', 'dana', 'shopeepay')
);

-- rollback

ALTER TABLE orders DROP CONSTRAINT orders_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_method_check CHECK (
    method IN ('va_bca', 'va_mandiri', 'va_bni', 'qris', 'gopay')
);
