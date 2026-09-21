import { startTransition, type FormEvent } from "react";

/**
 * React 19 clears every uncontrolled field after a form action finishes, even when it failed validation,
 * so people lose what they typed. Submitting through onSubmit instead keeps the values on screen.
 * Use together with `action`, which still handles the no-JavaScript case:
 *   <form action={action} onSubmit={keepValues(action)}>
 * Passing the submitter keeps `name`/`value` on the clicked button (e.g. "Preview" vs "Apply").
 */
export function keepValues(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => action(data));
  };
}
