package llm

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

func evaluation(text string) entity.CriterionEvaluation {
	return entity.CriterionEvaluation{
		Criterion: entity.RubricCriterion{Name: "Analisis", Weight: 40, LevelDescriptions: []string{"l1", "l2", "l3", "l4", "l5"}},
		Content:   entity.SubmissionContent{SlotValues: entity.SlotValues{"analisis": {Text: text}}},
	}
}

func TestFake_EvaluateCriterionIsDeterministic(t *testing.T) {
	fake := NewFake(0)

	first, err := fake.EvaluateCriterion(context.Background(), evaluation("Akar masalahnya N+1 query."))
	require.NoError(t, err)
	second, err := fake.EvaluateCriterion(context.Background(), evaluation("Akar masalahnya N+1 query."))
	require.NoError(t, err)

	assert.Equal(t, first, second)
	assert.NoError(t, entity.ValidateCriterionVerdict(first.Level, first.Reason))
	assert.GreaterOrEqual(t, first.Level, 2)
	// Alasan diambil dari deskripsi level rubrik.
	assert.Equal(t, evaluation("").Criterion.LevelDescriptions[first.Level-1], first.Reason)
}

func TestFake_ComposeFeedbackIsValid(t *testing.T) {
	fake := NewFake(0)
	criterion := evaluation("").Criterion
	tests := map[string][]entity.CriterionResult{
		"mixed":    {{Criterion: criterion, Level: 5, Reason: "l5"}, {Criterion: criterion, Level: 2, Reason: "l2"}},
		"all high": {{Criterion: criterion, Level: 5, Reason: "l5"}},
		"all low":  {{Criterion: criterion, Level: 2, Reason: "l2"}},
		"empty":    nil,
	}
	for name, results := range tests {
		t.Run(name, func(t *testing.T) {
			feedback, err := fake.ComposeFeedback(context.Background(), entity.FeedbackRequest{Results: results})

			require.NoError(t, err)
			assert.NoError(t, entity.ValidateFeedback(feedback))
		})
	}
}

func TestFake_RespectsContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := NewFake(time.Minute).EvaluateCriterion(ctx, evaluation("isi"))

	assert.ErrorIs(t, err, context.Canceled)
}
