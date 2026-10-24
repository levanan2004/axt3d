import { redirect } from 'react-router';

export function loader() {
  return redirect('/dat-in', 301);
}
