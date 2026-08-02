import React from "react";
import { LegalDocument } from "../components/LegalDocument";
import { PRIVACY_POLICY_MD } from "../lib/legalDocs";

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      path="/privacy"
      markdown={PRIVACY_POLICY_MD}
    />
  );
}
