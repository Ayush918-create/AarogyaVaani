import { PortalShell } from '@/components/portal-shell';
import { PatientMedicineHistory } from '@/components/patient-medicine-history';

export default function MedicinesPage() {
  return <PortalShell role="patient" title="My medicines">
    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-800 to-sky-700 p-6 text-white md:p-8">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-100">Care information</p>
      <h2 className="mt-2 text-3xl font-extrabold">Medication history</h2>
      <p className="mt-2 max-w-2xl text-cyan-50">Help your care team understand medicines you are currently using. Always follow your clinician’s advice for starting, changing, or stopping medicine.</p>
    </div>
    <PatientMedicineHistory />
  </PortalShell>;
}
