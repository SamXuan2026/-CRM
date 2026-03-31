import { useEffect, useState } from 'react';

interface UseDebouncedSearchInputOptions {
  initialValue?: string;
  delay?: number;
}

export const useDebouncedSearchInput = ({
  initialValue = '',
  delay = 400,
}: UseDebouncedSearchInputOptions = {}) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [inputValue, setInputValue] = useState(initialValue);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (isComposing) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSearchValue((prev) => (prev === inputValue ? prev : inputValue));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, inputValue, isComposing]);

  return {
    searchValue,
    inputValue,
    setInputValue,
    bindInput: {
      value: inputValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value),
      onCompositionStart: () => setIsComposing(true),
      onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => {
        setIsComposing(false);
        setInputValue(e.currentTarget.value);
      },
    },
  };
};
