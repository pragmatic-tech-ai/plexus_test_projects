import { Application } from "@pragmatic-tech-ai/mural";
import { Observable } from "@pragmatic-tech-ai/mural/runtime";
import { model } from "../generated/data.js";

export class AiAssistantM365App extends Observable
{
    constructor()
    {
        super();
        Application.current?.Services.addInstance(this);
    }

    public get HelloText(): string
    {
        return "Hello from ai-assistant-m365";
    }

    public get ConceptSummary(): string
    {
        return `The application has access to ${model.ConceptNames().length} concepts`;
    }
}
