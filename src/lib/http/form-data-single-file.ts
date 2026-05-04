/** Shared validation for multipart uploads — browsers/scripts may append duplicate `file` fields */

export const SINGLE_FILE_UPLOAD_MESSAGE = 'Upload one file at a time. Select a single PDF or TXT.';

/** Returns an error message if more than one File part exists for `fieldName`; otherwise null */
export function getMultipleFilesError(formData: FormData, fieldName = 'file'): string | null {
  const parts = formData.getAll(fieldName);
  const files = parts.filter((p): p is File => p instanceof File);
  return files.length > 1 ? SINGLE_FILE_UPLOAD_MESSAGE : null;
}
