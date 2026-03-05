import { Resume } from '@/types';

export const mockResumes: Resume[] = [
  {
    id: 'r1',
    name: 'Software Engineer Resume',
    fileName: 'alex_thompson_swe_resume.pdf',
    uploadDate: '2026-01-15',
    isActive: true,
  },
  {
    id: 'r2',
    name: 'Full Stack Developer Resume',
    fileName: 'alex_thompson_fullstack.pdf',
    uploadDate: '2026-02-01',
    isActive: false,
  },
  {
    id: 'r3',
    name: 'Technical Lead Resume',
    fileName: 'alex_thompson_tech_lead.pdf',
    uploadDate: '2025-12-20',
    isActive: false,
  },
];
