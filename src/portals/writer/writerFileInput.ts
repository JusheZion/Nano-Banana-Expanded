type WriterFileInput = Pick<HTMLInputElement, 'files' | 'value'>;

export function consumeWriterFileInputSelection(input: WriterFileInput): File[] {
  const files = Array.from(input.files ?? []);
  input.value = '';
  return files;
}
