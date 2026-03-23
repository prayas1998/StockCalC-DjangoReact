import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { isLikelyEmail, isValidUsername } from "@/lib/authIdentity";

const loginSchema = z.object({
  identifier: z.string()
    .min(1, "Username or email is required")
    .refine((value) => {
      const trimmed = value.trim();
      return isLikelyEmail(trimmed) || isValidUsername(trimmed);
    }, "Enter a valid username or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  switchMode: () => void;
  onSuccess: () => void;
}

const LoginForm = ({ switchMode, onSuccess }: LoginFormProps) => {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginValues) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.identifier, data.password);
      if (!error) {
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username or Email</FormLabel>
              <FormControl>
                <Input placeholder="your_username or existing email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sign in
            </>
          ) : (
            "Sign in"
          )}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" className="p-0" onClick={switchMode}>
            Sign up
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm; 
