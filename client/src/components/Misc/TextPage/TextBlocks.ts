import { ContactBlock, IntroBlock, PrivacyBlock } from './Text';

// -----------------------------------------------------------------------------

export type BlockType = 'intro' | 'contact' | 'privacy';

export const textBlocks: Record<BlockType, React.ComponentType> = {
  intro: IntroBlock,
  contact: ContactBlock,
  privacy: PrivacyBlock
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
