export interface FunctionCall {
    name?: string;
    arguments?: string;
}

export interface ToolCall {
    function: FunctionCall;
}

export interface ToolCallContent {
    type: 'tool_calls';
    tool_calls: ToolCall[];
}

export type OutputContent = ToolCallContent | { type: string; [key: string]: unknown };

export interface OutputBlock {
    content: OutputContent[];
}

export interface ResponsesCreateResponse {
    output?: OutputBlock[];
}

export interface InputTextContent {
    type: 'input_text';
    text: string;
}

export interface InputImageContent {
    type: 'input_image';
    image_url: { url: string };
}

export type InputContent = InputTextContent | InputImageContent;

export interface ResponsesCreateParams {
    model: string;
    input: Array<{ role: string; content: InputContent[] }>;
    temperature?: number;
    max_output_tokens?: number;
    top_p?: number;
    tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}

export interface ResponsesClient {
    create(params: ResponsesCreateParams): Promise<ResponsesCreateResponse>;
}
