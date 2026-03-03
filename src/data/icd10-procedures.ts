export interface ICD10Procedure {
  code: string;
  description: string;
}

export const icd10Procedures: ICD10Procedure[] = [
  // Cardiovascular
  { code: "02100Z9", description: "Coronary artery bypass graft (CABG)" },
  { code: "02703ZZ", description: "Percutaneous coronary intervention (PCI/angioplasty)" },
  { code: "02RF0JZ", description: "Aortic valve replacement" },
  { code: "02RG0JZ", description: "Mitral valve replacement" },
  { code: "02H63JZ", description: "Pacemaker insertion" },
  { code: "02HK3MZ", description: "Cardiac defibrillator insertion (ICD)" },
  { code: "027034Z", description: "Coronary stent placement" },
  { code: "02BN0ZZ", description: "Excision of pericardium" },
  { code: "04V03DZ", description: "Carotid endarterectomy" },
  { code: "04103J5", description: "Aortofemoral bypass" },
  { code: "04704ZZ", description: "Femoral artery angioplasty" },
  { code: "06L73CZ", description: "Saphenous vein ligation/stripping" },
  { code: "05HM33Z", description: "Central venous catheter insertion" },

  // Nervous system
  { code: "009U3ZZ", description: "Drainage of spinal canal (lumbar puncture)" },
  { code: "00B70ZZ", description: "Brain tumor excision (craniotomy)" },
  { code: "00JU0ZZ", description: "Inspection of spinal canal" },
  { code: "00N70ZZ", description: "Release of cerebral hemisphere" },
  { code: "009S00Z", description: "Drainage of spinal cord" },
  { code: "00HV0MZ", description: "Deep brain stimulation implant" },
  { code: "01N50ZZ", description: "Nerve release (carpal tunnel release)" },

  // Eye
  { code: "08RJ3JZ", description: "Cataract extraction with lens implant" },
  { code: "08Q1XZZ", description: "Repair of retinal detachment" },
  { code: "089LXZX", description: "Drainage of eye (trabeculectomy for glaucoma)" },
  { code: "08N03ZZ", description: "Laser eye surgery (LASIK)" },

  // Ear, nose, throat
  { code: "095D0ZZ", description: "Drainage of middle ear (myringotomy)" },
  { code: "09BR0JZ", description: "Cochlear implant" },
  { code: "09TM0ZZ", description: "Resection of nasal turbinate (turbinectomy)" },
  { code: "09TP0ZZ", description: "Resection of tonsils (tonsillectomy)" },
  { code: "09TQ0ZZ", description: "Resection of adenoids (adenoidectomy)" },
  { code: "09BS0ZZ", description: "Septoplasty (deviated septum repair)" },
  { code: "0C150ZZ", description: "Tracheostomy" },

  // Respiratory system
  { code: "0BBL0ZZ", description: "Lung lobectomy" },
  { code: "0BTK0ZZ", description: "Pneumonectomy (lung removal)" },
  { code: "0B9J00Z", description: "Thoracentesis (pleural drainage)" },
  { code: "0BBJ0ZX", description: "Lung biopsy" },
  { code: "0BHR7EZ", description: "Endotracheal intubation" },
  { code: "0WB60ZZ", description: "Chest tube insertion" },

  // GI / Digestive
  { code: "0D160Z4", description: "Gastric bypass surgery" },
  { code: "0DV64CZ", description: "Gastric sleeve (sleeve gastrectomy)" },
  { code: "0DT80ZZ", description: "Small bowel resection" },
  { code: "0DTN0ZZ", description: "Sigmoid colectomy" },
  { code: "0DTE0ZZ", description: "Right hemicolectomy" },
  { code: "0DBN4ZX", description: "Colonoscopy with biopsy" },
  { code: "0DJ08ZZ", description: "Upper endoscopy (EGD)" },
  { code: "0DTJ0ZZ", description: "Appendectomy" },
  { code: "0FT44ZZ", description: "Cholecystectomy (gallbladder removal)" },
  { code: "0F940ZX", description: "Liver biopsy" },
  { code: "0FB00ZZ", description: "Partial hepatectomy (liver resection)" },
  { code: "0FBG0ZZ", description: "Pancreatic resection (Whipple procedure)" },
  { code: "0DQ90ZZ", description: "Hernia repair (inguinal)" },
  { code: "0DQP0ZZ", description: "Hemorrhoidectomy" },

  // Hepatobiliary/Pancreas
  { code: "0F9B40Z", description: "ERCP (endoscopic retrograde cholangiopancreatography)" },
  { code: "0FJD4ZZ", description: "Inspection of pancreatic duct (endoscopic)" },

  // Musculoskeletal
  { code: "0SR9019", description: "Hip replacement (total)" },
  { code: "0SRC019", description: "Knee replacement (total)" },
  { code: "0SR30JZ", description: "Shoulder replacement (total)" },
  { code: "0SG10AJ", description: "Spinal fusion (lumbar)" },
  { code: "0SG00AJ", description: "Spinal fusion (cervical)" },
  { code: "0RB40ZZ", description: "Discectomy (lumbar disc)" },
  { code: "0QS00ZZ", description: "Open reduction internal fixation (ORIF)" },
  { code: "0KBN0ZZ", description: "Rotator cuff repair" },
  { code: "0SMD0ZZ", description: "Meniscectomy (knee)" },
  { code: "0SBD0ZZ", description: "ACL reconstruction" },
  { code: "0SBC0ZZ", description: "Knee arthroscopy" },
  { code: "0MQ50ZZ", description: "Shoulder arthroscopy" },
  { code: "0JD60ZZ", description: "Trigger finger release" },
  { code: "0KX00ZZ", description: "Tendon repair" },
  { code: "0PS20ZZ", description: "Reposition of cervical vertebra" },
  { code: "0QB30ZZ", description: "Bone biopsy" },
  { code: "0PB00ZX", description: "Bone marrow biopsy" },

  // Breast
  { code: "0HBT0ZZ", description: "Breast biopsy (excisional)" },
  { code: "0HTT0ZZ", description: "Mastectomy (breast removal)" },
  { code: "0HBU0ZZ", description: "Lumpectomy (breast-conserving surgery)" },
  { code: "0HRV07Z", description: "Breast reconstruction" },

  // Skin and subcutaneous
  { code: "0HBN0ZZ", description: "Skin biopsy" },
  { code: "0HD0XZZ", description: "Skin lesion excision" },
  { code: "0JD50ZZ", description: "Subcutaneous tissue drainage (abscess)" },
  { code: "0H00X74", description: "Skin graft" },

  // Urinary system
  { code: "0TT10ZZ", description: "Nephrectomy (kidney removal)" },
  { code: "0T9B70Z", description: "Lithotripsy (kidney stone)" },
  { code: "0TJB8ZZ", description: "Cystoscopy" },
  { code: "0TB10ZX", description: "Kidney biopsy" },
  { code: "0TTB0ZZ", description: "Bladder resection" },
  { code: "0T130ZZ", description: "Kidney transplant" },
  { code: "0TDB8ZZ", description: "Transurethral resection of bladder tumor" },

  // Male reproductive
  { code: "0VT00ZZ", description: "Prostatectomy" },
  { code: "0VB00ZZ", description: "Prostate biopsy (transrectal)" },
  { code: "0V500ZZ", description: "Vasectomy" },
  { code: "0VTC0ZZ", description: "Orchiectomy (testis removal)" },
  { code: "0VB70ZZ", description: "Circumcision" },

  // Female reproductive
  { code: "0UT90ZZ", description: "Hysterectomy (uterus removal)" },
  { code: "0UB14ZX", description: "Endometrial biopsy" },
  { code: "0UTC0ZZ", description: "Cervical conization (LEEP/cone biopsy)" },
  { code: "0UT20ZZ", description: "Oophorectomy (ovary removal)" },
  { code: "0U5B0ZZ", description: "Tubal ligation" },
  { code: "0UDB7ZZ", description: "Dilation and curettage (D&C)" },
  { code: "10D07Z6", description: "Cesarean section (C-section)" },
  { code: "10E0XZZ", description: "Normal vaginal delivery" },

  // Endocrine
  { code: "0GTK0ZZ", description: "Thyroidectomy (total)" },
  { code: "0GT20ZZ", description: "Adrenalectomy" },
  { code: "0GB30ZZ", description: "Parathyroidectomy" },

  // Lymphatic/hemic
  { code: "07B50ZZ", description: "Lymph node biopsy" },
  { code: "07T20ZZ", description: "Splenectomy (spleen removal)" },
  { code: "30230N1", description: "Blood transfusion" },
  { code: "30233G1", description: "Bone marrow transplant" },

  // General/other
  { code: "GZ58ZZZ", description: "Individual psychotherapy" },
  { code: "HZ91ZZZ", description: "Substance abuse detoxification" },
  { code: "F07Z0ZZ", description: "Physical therapy" },
  { code: "BW23ZZZ", description: "CT scan of chest" },
  { code: "BW25ZZZ", description: "CT scan of abdomen" },
  { code: "BW40ZZZ", description: "MRI of chest" },
  { code: "B024ZZZ", description: "MRI of heart" },
  { code: "B030ZZZ", description: "MRI of brain" },
  { code: "BP00ZZZ", description: "X-ray of spine" },
  { code: "BN20ZZZ", description: "Ultrasound of abdomen" },
  { code: "B248ZZ4", description: "Echocardiography" },
  { code: "4A023N7", description: "Cardiac catheterization" },
  { code: "4A02X4Z", description: "Electrocardiogram (ECG/EKG)" },
  { code: "4A00X4Z", description: "Electroencephalogram (EEG)" },
  { code: "DB22DZZ", description: "Radiation therapy" },
  { code: "3E03305", description: "Chemotherapy infusion" },
];

export function searchProcedures(query: string, limit = 20): ICD10Procedure[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return icd10Procedures
    .filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    )
    .slice(0, limit);
}
