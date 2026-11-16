export type PersonNameField =
  | 'firstName'
  | 'middleName'
  | 'lastName';

const NAME_PATTERN =
  /^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;

export function validatePersonName(
  value: string,
  label: string,
  required = true,
): string {
  const name = value.trim();

  if (!name) {
    return required ? `${label} is required.` : '';
  }

  if (name.length > 100) {
    return `${label} must not exceed 100 characters.`;
  }

  if (!NAME_PATTERN.test(name)) {
    return (
      `${label} must contain at least 3 letters, ` +
      'using letters, spaces, apostrophes or hyphens only.'
    );
  }

  return '';
}

export function validatePersonNames(
  values: Record<PersonNameField, string>,
): Partial<Record<PersonNameField, string>> {
  const errors: Partial<Record<PersonNameField, string>> = {};

  const fields: Array<{
    key: PersonNameField;
    label: string;
    required: boolean;
  }> = [
    { key: 'firstName', label: 'First name', required: true },
    { key: 'middleName', label: 'Middle name', required: false },
    { key: 'lastName', label: 'Last name', required: true },
  ];

  for (const field of fields) {
    const message = validatePersonName(
      values[field.key],
      field.label,
      field.required,
    );

    if (message) {
      errors[field.key] = message;
    }
  }

  return errors;
}