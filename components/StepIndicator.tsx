
import React from 'react';
import { AppStep } from '../types';

interface Props {
  currentStep: AppStep;
}

export const StepIndicator: React.FC<Props> = ({ currentStep }) => {
  const steps = [
    { id: AppStep.INITIAL, label: 'Ínicio' },
    { id: AppStep.CONSENT, label: 'Protocolos' },
    { id: AppStep.EXTRACTION, label: 'Exportação' },
    { id: AppStep.UPLOAD, label: 'Processamento' },
    { id: AppStep.REVIEW, label: 'Finalização' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-10">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStepIndex > index;

        return (
          <div key={step.id} className="flex items-center gap-3">
             <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                isActive ? 'bg-[#3d7a74] scale-150 shadow-[0_0_8px_rgba(61,122,116,1)]' : 
                isCompleted ? 'bg-[#3d7a74] opacity-40' : 
                'bg-[#2c3440]'
              }`} />
             <span className={`text-[8px] font-black uppercase tracking-widest italic transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                {step.label}
             </span>
          </div>
        );
      })}
    </div>
  );
};
