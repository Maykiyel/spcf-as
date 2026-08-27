import schoolLogo from "@/assets/logo.png";

// Static — no backend model exists for school identity (no
// settings/school-profile table). Kept feature-local rather than in
// src/config/: nothing outside the Acknowledgement Receipt currently
// needs this. Promote to a shared location only once a second real
// consumer needs the same header (see CONTEXT.md's `src/api/` entry for
// the same promotion rule applied to API calls).
export const SCHOOL_NAME = "SYSTEMS PLUS COLLEGE FOUNDATION";
export const SCHOOL_ADDRESS = "Mc Arthur Hi-Way Balibago, Angeles City, Pampanga";
export { schoolLogo };
