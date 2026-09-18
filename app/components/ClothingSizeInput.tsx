'use client';

import { useId, type ComponentProps } from 'react';

const SIZES = ['59', '66', '73', '80', '90', '100', '110', '120', '130', '140', '150', '160', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '均码'];

export default function ClothingSizeInput(props: Omit<ComponentProps<'input'>, 'type' | 'list'>) {
  const listId = useId();
  return <>
    <input type="text" list={listId} aria-label="尺码" placeholder="如 80、90、M，也可自定义" maxLength={40} {...props} />
    <datalist id={listId}>{SIZES.map(size => <option key={size} value={size} />)}</datalist>
  </>;
}
