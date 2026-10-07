// Status mahasiswa: dipakai onboarding dan halaman Profil.
export const STUDENT_STATUS_OPTIONS = [
  {
    value: 'final_year',
    label: 'Mahasiswa tingkat akhir',
    description: 'Sedang menyelesaikan studi dan bersiap masuk dunia kerja.',
  },
  {
    value: 'fresh_graduate',
    label: 'Fresh graduate',
    description: 'Sudah lulus dan sedang mencari pekerjaan pertama.',
  },
] as const;
