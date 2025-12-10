export interface ChatInputProps {
  onSubmit: (message: string) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
}
