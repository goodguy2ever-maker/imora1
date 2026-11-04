import type { ReactNode, MouseEvent, AnchorHTMLAttributes } from 'react';
import { navigate } from '@/lib/router';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode };

export default function Link({ to, onClick, ...rest }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={handleClick} {...rest} />;
}
