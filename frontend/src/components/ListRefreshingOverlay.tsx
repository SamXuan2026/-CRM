import React from 'react';
import { Box, HStack, Skeleton, VStack } from '@chakra-ui/react';

interface ListRefreshingOverlayProps {
  columns: number;
  getColumnFlex?: (columnIndex: number) => number;
}

export const ListRefreshingOverlay: React.FC<ListRefreshingOverlayProps> = ({
  columns,
  getColumnFlex,
}) => (
  <Box
    position="absolute"
    inset={0}
    bg="rgba(255,255,255,0.58)"
    backdropFilter="blur(2px)"
    pointerEvents="none"
    borderRadius="12px"
    px={3}
    py={12}
  >
    <VStack spacing={4} align="stretch">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <HStack key={rowIndex} spacing={4} align="center">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={`${rowIndex}-${columnIndex}`}
              height="14px"
              borderRadius="full"
              flex={getColumnFlex?.(columnIndex) ?? (columnIndex === 0 ? 1.6 : 1)}
              startColor="blue.50"
              endColor="gray.100"
            />
          ))}
        </HStack>
      ))}
    </VStack>
  </Box>
);
