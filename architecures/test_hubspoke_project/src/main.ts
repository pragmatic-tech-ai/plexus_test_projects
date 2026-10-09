import { Application } from "@pragmatic-tech-ai/mural";
import { Observable } from "@pragmatic-tech-ai/mural/runtime";
import { model } from "../generated/data.js";

export class TestWafArchitecturesApp extends Observable
{
    constructor()
    {
        super();
        Application.current?.Services.addInstance(this);
    }

    public get HelloText(): string
    {
        return "Hello from test_waf_architectures";
    }

    public get ConceptSummary(): string
    {
        return `The application has access to ${model.ConceptNames().length} concepts`;
    }
}
