package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReviewQueueEntry_DecidedAt(t *testing.T) {
	reviewedAt := time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)
	revisedAt := reviewedAt.Add(-time.Hour)

	pending := ReviewQueueEntry{Enrollment: Enrollment{Status: EnrollmentInReview}, Submission: &Submission{}}
	assert.Nil(t, pending.DecidedAt())

	graded := ReviewQueueEntry{Enrollment: Enrollment{Status: EnrollmentPassed}, Submission: &Submission{Review: &Review{ReviewedAt: reviewedAt}}}
	require.NotNil(t, graded.DecidedAt())
	assert.Equal(t, reviewedAt, *graded.DecidedAt())

	revised := ReviewQueueEntry{
		Enrollment: Enrollment{Status: EnrollmentRevisionRequested},
		Submission: &Submission{RevisionRequest: &RevisionRequest{CreatedAt: revisedAt}},
	}
	require.NotNil(t, revised.DecidedAt())
	assert.Equal(t, revisedAt, *revised.DecidedAt())
}

func TestReviewQueueEntry_CanRequestRevision(t *testing.T) {
	assert.True(t, (&ReviewQueueEntry{Enrollment: Enrollment{Status: EnrollmentInReview, RevisionCount: 1}}).CanRequestRevision())
	assert.False(t, (&ReviewQueueEntry{Enrollment: Enrollment{Status: EnrollmentInReview, RevisionCount: MaxRevisions}}).CanRequestRevision())
	assert.False(t, (&ReviewQueueEntry{Enrollment: Enrollment{Status: EnrollmentPassed}}).CanRequestRevision())
}

func TestInitialShareConsent(t *testing.T) {
	assert.Equal(t, ShareConsentPending, InitialShareConsent(ShareDefaultAsk))
	assert.Equal(t, ShareConsentGranted, InitialShareConsent(ShareDefaultAlways))
	assert.Equal(t, ShareConsentDeclined, InitialShareConsent(ShareDefaultNever))
}

func TestDraftValues_RoundTrip(t *testing.T) {
	empty, err := DraftGradeValue{}.Value()
	require.NoError(t, err)
	assert.Equal(t, "{}", empty)

	var scanned DraftGradeValue
	require.NoError(t, scanned.Scan([]byte("{}")))
	assert.Nil(t, scanned.Grade, "an empty object means no draft section")

	grade := &DraftGrade{Criteria: []DraftCriterion{{Name: "Desain", Level: 4, Reason: "jelas"}}, Strengths: "a\nb"}
	raw, err := DraftGradeValue{Grade: grade}.Value()
	require.NoError(t, err)
	require.NoError(t, scanned.Scan(raw))
	assert.Equal(t, grade, scanned.Grade)

	var revision DraftRevisionValue
	require.NoError(t, revision.Scan(`{"reason":"Tautan tidak bisa dibuka","note":""}`))
	require.NotNil(t, revision.Revision)
	assert.Equal(t, "Tautan tidak bisa dibuka", revision.Revision.Reason)
}

func TestReviewDraftPatch_Apply(t *testing.T) {
	draft := ReviewDraft{Decision: ReviewDecisionGrade, Grade: DraftGradeValue{Grade: &DraftGrade{Strengths: "lama"}}}
	decision := ReviewDecisionRevision

	ReviewDraftPatch{Decision: &decision, HasRevision: true, Revision: &DraftRevision{Reason: "x"}}.Apply(&draft)

	assert.Equal(t, ReviewDecisionRevision, draft.Decision)
	assert.Equal(t, "lama", draft.Grade.Grade.Strengths, "grade untouched when not sent")
	assert.Equal(t, "x", draft.Revision.Revision.Reason)

	ReviewDraftPatch{HasGrade: true}.Apply(&draft)
	assert.Nil(t, draft.Grade.Grade, "explicit null clears the section")
}

func TestIsRevisionReason(t *testing.T) {
	assert.True(t, IsRevisionReason("Deliverable belum lengkap"))
	assert.False(t, IsRevisionReason("lainnya"))
}
