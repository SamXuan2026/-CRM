import React from 'react';
import { Button, ButtonGroup } from '@chakra-ui/react';

export type ListDensity = 'comfortable' | 'compact';

interface ListDensityToggleProps {
  value: ListDensity;
  onChange: (value: ListDensity) => void;
}

export const ListDensityToggle: React.FC<ListDensityToggleProps> = ({
  value,
  onChange,
}) => (
  <ButtonGroup isAttached variant="outline" size="sm">
    <Button
      onClick={() => onChange('comfortable')}
      colorScheme={value === 'comfortable' ? 'blue' : undefined}
      variant={value === 'comfortable' ? 'solid' : 'outline'}
    >
      舒适
    </Button>
    <Button
      onClick={() => onChange('compact')}
      colorScheme={value === 'compact' ? 'blue' : undefined}
      variant={value === 'compact' ? 'solid' : 'outline'}
    >
      紧凑
    </Button>
  </ButtonGroup>
);
