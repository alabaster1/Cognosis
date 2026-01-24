'use client';

/**
 * AgentBuilder - Visual Workflow Creator
 * Allows researchers to create experiment workflows without coding
 */

import { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  Plus, Save, Play, Eye, Trash2, Settings,
  Target, Users, Brain, Zap, Check, X
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  order: number;
  stepType: string;
  name: string;
  description: string;
  agentId?: string;
  config?: Record<string, any>;
  requiredData?: string[];
  outputData?: string[];
}

interface ExperimentTemplate {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  workflowSteps: WorkflowStep[];
  guardrails?: Record<string, any>;
  requiresConsent: boolean;
  minAge: number;
  isPublic: boolean;
  isPremium: boolean;
}

const STEP_TYPES = [
  { id: 'target_generation', name: 'Target Generation', icon: Target, color: 'violet' },
  { id: 'participant_guidance', name: 'Participant Guidance', icon: Users, color: 'blue' },
  { id: 'data_capture', name: 'Data Capture', icon: Brain, color: 'green' },
  { id: 'ai_scoring', name: 'AI Scoring', icon: Zap, color: 'yellow' },
  { id: 'blockchain_commit', name: 'Blockchain Commit', icon: Check, color: 'orange' },
];

const CATEGORIES = [
  'remote-viewing',
  'telepathy',
  'precognition',
  'consciousness',
  'psychokinesis',
  'time-causality',
  'group-network'
];

export default function AgentBuilderPage() {
  const [template, setTemplate] = useState<ExperimentTemplate>({
    name: '',
    slug: '',
    description: '',
    category: 'remote-viewing',
    difficulty: 'beginner',
    workflowSteps: [],
    requiresConsent: true,
    minAge: 18,
    isPublic: false,
    isPremium: false
  });

  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const addStep = (stepType: string) => {
    const stepTypeData = STEP_TYPES.find(st => st.id === stepType);

    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      order: template.workflowSteps.length,
      stepType: stepType,
      name: stepTypeData?.name || stepType,
      description: `Add description for this ${stepTypeData?.name || 'step'}`,
      config: {},
      requiredData: [],
      outputData: []
    };

    setTemplate({
      ...template,
      workflowSteps: [...template.workflowSteps, newStep]
    });
  };

  const removeStep = (stepId: string) => {
    const updatedSteps = template.workflowSteps
      .filter(s => s.id !== stepId)
      .map((s, idx) => ({ ...s, order: idx }));

    setTemplate({
      ...template,
      workflowSteps: updatedSteps
    });
    setSelectedStep(null);
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const steps = [...template.workflowSteps];
    const idx = steps.findIndex(s => s.id === stepId);

    if (direction === 'up' && idx > 0) {
      [steps[idx], steps[idx - 1]] = [steps[idx - 1], steps[idx]];
    } else if (direction === 'down' && idx < steps.length - 1) {
      [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]];
    }

    // Update order
    steps.forEach((s, i) => s.order = i);

    setTemplate({
      ...template,
      workflowSteps: steps
    });
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    const updatedSteps = template.workflowSteps.map(s =>
      s.id === stepId ? { ...s, ...updates } : s
    );

    setTemplate({
      ...template,
      workflowSteps: updatedSteps
    });

    if (selectedStep?.id === stepId) {
      setSelectedStep({ ...selectedStep, ...updates });
    }
  };

  const saveTemplate = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        alert('Template saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    }
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
            AgentBuilder
          </h1>
          <p className="text-slate-400">
            Create experiment workflows visually - no coding required
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Template Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info */}
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Template Info</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Advanced Remote Viewing"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Description</label>
                  <textarea
                    value={template.description}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                    rows={3}
                    placeholder="Describe your experiment..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Category</label>
                  <select
                    value={template.category}
                    onChange={(e) => setTemplate({ ...template, category: e.target.value })}
                    className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Difficulty</label>
                  <select
                    value={template.difficulty}
                    onChange={(e) => setTemplate({ ...template, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={template.requiresConsent}
                    onChange={(e) => setTemplate({ ...template, requiresConsent: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">Requires Consent</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={template.isPublic}
                    onChange={(e) => setTemplate({ ...template, isPublic: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">Public Template</label>
                </div>
              </div>
            </div>

            {/* Add Step Buttons */}
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Add Step</h2>

              <div className="space-y-2">
                {STEP_TYPES.map(stepType => {
                  const Icon = stepType.icon;
                  return (
                    <button
                      key={stepType.id}
                      onClick={() => addStep(stepType.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 bg-[#142030] hover:bg-[#1a2535] rounded-lg transition-colors text-left`}
                    >
                      <Icon className={`w-5 h-5 text-${stepType.color}-400`} />
                      <span>{stepType.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={saveTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Template
              </button>
              <button
                onClick={() => setIsPreview(!isPreview)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#142030] hover:bg-[#1a2535] rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5" />
                {isPreview ? 'Edit Mode' : 'Preview Mode'}
              </button>
            </div>
          </div>

          {/* Center Panel - Workflow Steps */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Workflow Steps</h2>

              {template.workflowSteps.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No steps yet. Add steps from the left panel.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {template.workflowSteps.map((step, idx) => {
                    const stepTypeData = STEP_TYPES.find(st => st.id === step.stepType);
                    const Icon = stepTypeData?.icon || Settings;

                    return (
                      <div
                        key={step.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedStep?.id === step.id
                            ? 'bg-cyan-900/20 border-cyan-500'
                            : 'bg-[#142030] border-[#1a2535] hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedStep(step)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                                disabled={idx === 0}
                                className="text-xs hover:text-cyan-400 disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                                disabled={idx === template.workflowSteps.length - 1}
                                className="text-xs hover:text-cyan-400 disabled:opacity-30"
                              >
                                ▼
                              </button>
                            </div>
                            <Icon className={`w-5 h-5 text-${stepTypeData?.color}-400`} />
                            <div>
                              <div className="font-semibold">{step.order + 1}. {step.name}</div>
                              <div className="text-xs text-slate-400">{step.stepType}</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-400">{step.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Step Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Step Configuration</h2>

              {!selectedStep ? (
                <div className="text-center py-12 text-slate-500">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a step to configure</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Step Name</label>
                    <input
                      type="text"
                      value={selectedStep.name}
                      onChange={(e) => updateStep(selectedStep.id, { name: e.target.value })}
                      className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Description</label>
                    <textarea
                      value={selectedStep.description}
                      onChange={(e) => updateStep(selectedStep.id, { description: e.target.value })}
                      className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Assign Agent</label>
                    <select
                      value={selectedStep.agentId || ''}
                      onChange={(e) => updateStep(selectedStep.id, { agentId: e.target.value || undefined })}
                      className="w-full px-4 py-2 bg-[#142030] border border-[#1a2535] rounded-lg focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">None</option>
                      <option value="experiment_conductor">ExperimentConductor</option>
                      <option value="data_analyst">DataAnalyst</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-[#1a2535]">
                    <p className="text-xs text-slate-500">Step ID: {selectedStep.id}</p>
                    <p className="text-xs text-slate-500">Order: {selectedStep.order + 1}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
