// Development stubs — placeholder components. Replace with real implementations.
import React from 'react'

interface MessageListProps {
    messages: unknown[]
    streaming?: boolean
    currentStream?: string
    showThinking?: boolean
}

interface InputAreaProps {
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    isLoading?: boolean
    placeholder?: string
}

interface ToolPanelProps {
    tools: unknown[]
    onExecute: (name: string) => void
    disabled?: boolean
}

export const MessageList = ({ messages, streaming, currentStream, showThinking }: MessageListProps) => <div>MessageList Stub</div>
export const InputArea = ({ value, onChange, onSubmit, isLoading, placeholder }: InputAreaProps) => <div>InputArea Stub</div>
export const ToolPanel = ({ tools, onExecute, disabled }: ToolPanelProps) => <div>ToolPanel Stub</div>
