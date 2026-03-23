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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { isValidUsername, normalizeUsername } from "@/lib/authIdentity";

const signupSchema = z
  .object({
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be 30 characters or less")
      .refine((value) => isValidUsername(value), "Use lowercase letters, numbers, or underscores only"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  switchMode: () => void;
  onSuccess: () => void;
}

const SignupForm = ({ switchMode, onSuccess }: SignupFormProps) => {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameExists, setUsernameExists] = useState(false);
  
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupValues) => {
    setIsLoading(true);
    setFormError(null);
    setUsernameExists(false);
    
    try {
      const { error } = await signUp(normalizeUsername(data.username), data.password);
      
      if (!error) {
        onSuccess();
      } else {
        // Check for username conflict errors.
        if (error.message && (
            error.message.includes("already registered") || 
            error.message.includes("already in use") ||
            error.message.includes("already exists")
          )) {
          setUsernameExists(true);
        } else {
          setFormError(error.message || "An error occurred during signup");
        }
      }
    } catch (error) {
      setFormError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        {usernameExists && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="flex items-center gap-2">
              This username is already taken.
              <Button 
                variant="link" 
                className="h-auto p-0" 
                onClick={switchMode}
              >
                Sign in instead
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="your_username" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">3-30 chars, lowercase letters, numbers, underscores.</p>
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
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sign up
            </>
          ) : (
            "Sign up"
          )}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="p-0" onClick={switchMode}>
            Sign in
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SignupForm;
