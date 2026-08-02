import React from "react";
import { LegalDocument } from "../components/LegalDocument";
import { TERMS_OF_SERVICE_MD } from "../lib/legalDocs";

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Service"
      path="/terms"
      markdown={TERMS_OF_SERVICE_MD}
    />
  );
}
