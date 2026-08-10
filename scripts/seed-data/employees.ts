/**
 * Seed data: employees — master semua karyawan.
 * Source: scripts/seed-data/employees.json (dibuild dari attendance-*.xlsx + manual corrections).
 * PKL tidak eligible snack (isSnackEligible=false), sisanya true.
 */
import employeesJson from './employees.json';

export interface EmployeeSeed {
  nama: string;
  nip: string | null;
  divisi: string | null;
  isSnackEligible: boolean;
}

export const employeesSeed: EmployeeSeed[] = employeesJson.map((e) => ({
  nama: e.nama,
  nip: e.nip || null,
  divisi: e.divisi || null,
  isSnackEligible: e.divisi !== 'PKL',
}));
