import { Toaster as Sonner } from "sonner";

const Toaster = (props) => {
  return (
    <Sonner
      richColors
      closeButton
      position="top-right"
      {...props}
    />
  );
};

export { Toaster };
