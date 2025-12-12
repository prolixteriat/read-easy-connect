import React from 'react';
import { textBlocks, type BlockType } from './TextBlocks';

// -----------------------------------------------------------------------------

interface TextPageProps {
  blockType: BlockType;
}

export default function TextPage({ blockType }: TextPageProps): React.JSX.Element{
  const Component = textBlocks[blockType];
  return (
    <div className='max-w-[600px] space-y-5'>
      <Component />
    </div>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
