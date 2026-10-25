package entity

import "sort"

const (
	// RecommendationLimit adalah jumlah rekomendasi di dashboard.
	RecommendationLimit = 3
	// RecommendationCandidatePool adalah jumlah case terpopuler yang diperingkat ulang.
	RecommendationCandidatePool = 100
)

// RecommendedTier mengikuti funnel AI → B2B: belum lulus AI case → AI dulu; sudah lulus → B2B.
func RecommendedTier(hasPassedAICase bool) Tier {
	if hasPassedAICase {
		return TierB2B
	}
	return TierAI
}

// RankRecommendations memilih case yang belum diambil: bidang pilihan peserta bernilai 2, tier
// sesuai tahap bernilai 1, lalu yang paling banyak peserta. candidates sudah tanpa case yang
// pernah diambil peserta.
func RankRecommendations(candidates []Case, userFields []string, preferTier Tier, limit int) []Case {
	score := func(item Case) int {
		total := 0
		for _, field := range userFields {
			if item.FieldKey == field {
				total += 2
				break
			}
		}
		if item.Tier == preferTier {
			total++
		}
		return total
	}

	ranked := make([]Case, len(candidates))
	copy(ranked, candidates)
	sort.SliceStable(ranked, func(i, j int) bool {
		si, sj := score(ranked[i]), score(ranked[j])
		if si != sj {
			return si > sj
		}
		return ranked[i].ParticipantCount > ranked[j].ParticipantCount
	})
	if len(ranked) > limit {
		ranked = ranked[:limit]
	}
	return ranked
}
