package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

type seedPartner struct {
	name     string
	industry string
	about    string
}

var partners = []seedPartner{
	{
		name:     "Astral",
		industry: "Otomotif, Manufaktur & Jasa Keuangan",
		about:    "Grup usaha nasional terdiversifikasi yang bergerak di bidang otomotif, jasa keuangan, alat berat, pertambangan, agribisnis, infrastruktur, dan teknologi informasi di Indonesia.",
	},
	{
		name:     "BCAA",
		industry: "Perbankan & Layanan Keuangan",
		about:    "Bank swasta terkemuka di Indonesia yang berfokus pada layanan perbankan transaksi, pembiayaan korporasi, perbankan digital, dan ekosistem pembayaran ritel.",
	},
	{
		name:     "Belibeli",
		industry: "E-Commerce & Ritel Omnichannel",
		about:    "Platform perdagangan elektronik dan ritel omnichannel di Indonesia yang menghubungkan brand resmi, merchant lokal, dan konsumen dengan dukungan logistik terintegrasi.",
	},
	{
		name:     "Danah",
		industry: "Fintech & Dompet Digital",
		about:    "Perusahaan teknologi finansial yang menyediakan infrastruktur dompet digital, pembayaran QRIS, transfer dana, dan layanan keuangan inklusif bagi masyarakat dan UMKM.",
	},
	{
		name:     "Halodek",
		industry: "Healthtech & Layanan Kesehatan Digital",
		about:    "Platform ekosistem kesehatan digital di Indonesia yang menghubungkan pasien dengan dokter, apotek, layanan lab, serta asuransi kesehatan secara daring.",
	},
	{
		name:     "Kopi Memory",
		industry: "Food & Beverage (F&B) Ritel",
		about:    "Jaringan kedai kopi modern berbasis teknologi di Indonesia yang menggabungkan pengalaman gerai fisik, pemesanan lewat aplikasi, dan rantai pasok bahan baku berskala nasional.",
	},
	{
		name:     "Paragone Corp",
		industry: "FMCG Kosmetik & Perawatan Diri",
		about:    "Perusahaan manufaktur dan distribusi produk kecantikan serta perawatan diri terkemuka di Indonesia dengan portofolio brand lokal yang didukung riset dan inovasi.",
	},
	{
		name:     "Sayap",
		industry: "FMCG Kebutuhan Rumah Tangga & Makanan",
		about:    "Perusahaan barang konsumsi cepat saji (FMCG) besar di Indonesia yang memproduksi dan mendistribusikan produk perawatan rumah tangga, perawatan pribadi, serta makanan dan minuman.",
	},
	{
		name:     "Travelokal",
		industry: "Travel & Lifestyle Tech",
		about:    "Platform perjalanan dan gaya hidup di Asia Tenggara yang menyediakan pemesanan tiket transportasi, akomodasi, aktivitas wisata, serta layanan finansial perjalanan.",
	},
	{
		name:     "Univeler",
		industry: "FMCG Multinasional",
		about:    "Perusahaan barang konsumsi multinasional dengan jaringan manufaktur, distribusi, dan pemasaran produk nutrisi, kebersihan, serta perawatan tubuh di seluruh Indonesia.",
	},
}

func seedPartners(ctx context.Context, db *gorm.DB) error {
	now := time.Now().UTC()
	for _, item := range partners {
		var existing entity.Partner
		err := db.WithContext(ctx).Select("id").Where("name = ?", item.name).Take(&existing).Error
		if err == nil {
			fmt.Printf("partner   %-24s skipped (already exists)\n", item.name)
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("failed to check partner %s: %w", item.name, err)
		}

		partner := entity.Partner{
			ID:        uuid.NewString(),
			Name:      item.name,
			Industry:  item.industry,
			About:     item.about,
			IsActive:  true,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := db.WithContext(ctx).Create(&partner).Error; err != nil {
			return fmt.Errorf("failed to seed partner %s: %w", item.name, err)
		}
		fmt.Printf("partner   %-24s created\n", item.name)
	}
	return nil
}
