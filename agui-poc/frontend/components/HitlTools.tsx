'use client';

import { useHumanInTheLoop } from '@copilotkit/react-core';

import { ApprovalModal } from '@/components/ApprovalModal';

export function HitlTools() {
  useHumanInTheLoop({
    name: 'save_generated_data',
    description:
      'Ask the user to confirm before saving generated payloads (UUIDs, lists, etc.).',
    parameters: [
      {
        name: 'data',
        type: 'string',
        description: 'Full text payload proposed for storage.',
        required: true,
      },
    ],
    render: ({ args, status, respond }) => (
      <ApprovalModal args={args} status={status} respond={respond} />
    ),
  });

  return null;
}
