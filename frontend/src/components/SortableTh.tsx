import React from 'react';
import { HStack, Icon, Text, Th } from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

export type SortOrder = 'asc' | 'desc';

interface SortableThProps {
  label: string;
  column: string;
  activeSortBy: string;
  activeSortOrder: SortOrder;
  onToggle: (column: string) => void;
}

export const SortableTh: React.FC<SortableThProps> = ({
  label,
  column,
  activeSortBy,
  activeSortOrder,
  onToggle,
}) => {
  const isActive = activeSortBy === column;

  return (
    <Th
      cursor="pointer"
      userSelect="none"
      onClick={() => onToggle(column)}
      fontSize="sm"
      fontWeight="800"
      color={isActive ? 'brand.700' : 'brand.600'}
      _hover={{ color: 'brand.800', bg: 'blue.100' }}
      transition="color 0.18s ease, background-color 0.18s ease"
    >
      <HStack spacing={1} align="center" whiteSpace="nowrap">
        <Text fontSize="inherit" fontWeight="inherit" whiteSpace="nowrap">{label}</Text>
        <Icon
          as={isActive ? (activeSortOrder === 'asc' ? FiChevronUp : FiChevronDown) : FiChevronDown}
          boxSize={3.5}
          color={isActive ? 'brand.500' : 'blue.300'}
          opacity={isActive ? 1 : 0.45}
        />
      </HStack>
    </Th>
  );
};
