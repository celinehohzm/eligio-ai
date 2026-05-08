import { Toaster as SonnerBase } from "sonner";
import { useTheme } from "next-themes";

const Toaster = (props) => {
  const { resolvedTheme } = useTheme();
  const sonnerTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <SonnerBase
      richColors
      closeButton
      position="top-right"
      theme={sonnerTheme}
      {...props}
    />
  );
};

export { Toaster };
