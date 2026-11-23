import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { User, Lock, Trash2, Eye, EyeOff } from 'lucide-react';
import { profileApi } from '@/services/profileApi';
import Header from '@/components/ui/header';
import { isValidUsername, normalizeUsername } from '@/lib/authIdentity';

interface ProfileData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string | null;
  last_login: string | null;
}

interface ValidationErrors {
  [key: string]: string[];
}

const Profile = () => {
  const { user, signOut, loading: authLoading, updateUserProfile, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [profileForm, setProfileForm] = useState({
    username: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [deleteForm, setDeleteForm] = useState({
    password: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isProfileFormDirty, setIsProfileFormDirty] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrors({});
      const data = await profileApi.getProfile();
      setProfileData(data);
      setProfileForm({
        username: data.username || (data.email ? data.email.split('@')[0] : '')
      });
      setIsProfileFormDirty(false);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'Please log in again to access your profile'
        });
        navigate('/');
      } else if (status === 403) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to access this profile'
        });
      } else if (status && status >= 500) {
        toast({
          variant: 'destructive',
          title: 'Server Error',
          description: 'Our servers are experiencing issues. Please try again later.'
        });
      } else {
        const message = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load profile information';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const validateProfileForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    const normalizedUsername = normalizeUsername(profileForm.username);

    if (!normalizedUsername) {
      newErrors.username = ['Username is required'];
    } else if (!isValidUsername(normalizedUsername)) {
      newErrors.username = ['Username must be 3-30 chars with lowercase letters, numbers, or underscores'];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateProfileForm()) {
      return;
    }

    setUpdating(true);

    try {
      const normalizedUsername = normalizeUsername(profileForm.username);
      const response = await profileApi.updateProfile({ username: normalizedUsername });

      if (user) {
        try {
          const supabaseResult = await updateUserProfile({ username: normalizedUsername }, false);
          if (supabaseResult.error) {
            toast({
              variant: 'default',
              title: 'Partial Success',
              description: 'Profile was saved, but session sync may take a moment.'
            });
          } else {
            await refreshSession();
          }
        } catch (supabaseError) {
          console.warn('Supabase profile update failed:', supabaseError);
        }
      }

      if (response.profile) {
        setProfileData(response.profile);
        setProfileForm({
          username: response.profile.username || normalizedUsername
        });
        setIsProfileFormDirty(false);
      }

      toast({
        title: 'Success',
        description: response.message || 'Profile updated successfully'
      });
    } catch (error: unknown) {
      const apiErrors = (error as { response?: { data?: { errors?: ValidationErrors } } })?.response?.data?.errors;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update profile'
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!passwordForm.current_password) {
      newErrors.current_password = ['Current password is required'];
    }

    if (!passwordForm.new_password) {
      newErrors.new_password = ['New password is required'];
    } else if (passwordForm.new_password.length < 8) {
      newErrors.new_password = ['Password must be at least 8 characters long'];
    }

    if (!passwordForm.confirm_password) {
      newErrors.confirm_password = ['Please confirm your new password'];
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      newErrors.confirm_password = ['Passwords do not match'];
    }

    if (
      passwordForm.current_password &&
      passwordForm.new_password &&
      passwordForm.current_password === passwordForm.new_password
    ) {
      newErrors.new_password = ['New password must be different from current password'];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validatePasswordForm()) {
      return;
    }

    setUpdating(true);

    try {
      const response = await profileApi.changePassword(passwordForm);
      toast({
        title: 'Success',
        description: response.message || 'Password changed successfully'
      });
      resetPasswordForm();
    } catch (error: unknown) {
      const apiErrors = (error as { response?: { data?: { errors?: ValidationErrors } } })?.response?.data?.errors;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to change password'
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setErrors({});
    setDeleting(true);

    try {
      const response = await profileApi.deleteAccount(deleteForm.password);

      if (response.success) {
        toast({
          title: 'Account Deleted',
          description: response.message
        });

        await signOut();
        navigate('/');
      } else if (response.support_needed) {
        toast({
          variant: 'destructive',
          title: 'Partial Account Deletion',
          description: response.message,
          duration: 10000
        });

        await signOut();
        navigate('/');
      } else {
        toast({
          variant: 'destructive',
          title: 'Account Deletion Failed',
          description: response.message || 'Failed to delete account completely'
        });
      }
    } catch (error: unknown) {
      const apiErrors = (error as { response?: { data?: { errors?: ValidationErrors } } })?.response?.data?.errors;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        const message = (error as { message?: string })?.message ||
          'Failed to delete account. Please try again or contact support.';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message
        });
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteForm({ password: '' });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const resetProfileForm = () => {
    if (profileData) {
      setProfileForm({
        username: profileData.username || ''
      });
      setIsProfileFormDirty(false);
      setErrors({});
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setErrors({});
  };

  const handleProfileFormChange = (value: string) => {
    setProfileForm({ username: value });
    setIsProfileFormDirty(true);
    if (errors.username) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.username;
        return next;
      });
    }
  };

  const handlePasswordFormChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and security settings</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your username</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => handleProfileFormChange(e.target.value)}
                        placeholder="your_username"
                      />
                      <p className="text-xs text-muted-foreground">3-30 characters. Use lowercase letters, numbers, and underscores.</p>
                      {errors.username && (
                        <p className="text-sm text-destructive">{errors.username[0]}</p>
                      )}
                    </div>

                    {profileData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                          <p className="text-sm text-foreground">
                            {profileData.date_joined
                              ? new Date(profileData.date_joined).toLocaleDateString()
                              : 'Not available'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                          <p className="text-sm text-foreground">
                            {profileData.last_login
                              ? new Date(profileData.last_login).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button type="submit" disabled={updating} className="flex-1 md:flex-none">
                        {updating ? 'Updating...' : 'Update Profile'}
                      </Button>
                      {isProfileFormDirty && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetProfileForm}
                          disabled={updating}
                          className="flex-1 md:flex-none"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={(e) => handlePasswordFormChange('current_password', e.target.value)}
                          placeholder="Enter your current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.current_password && (
                        <p className="text-sm text-destructive">{errors.current_password[0]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={(e) => handlePasswordFormChange('new_password', e.target.value)}
                          placeholder="Enter your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.new_password && (
                        <div className="space-y-1">
                          {errors.new_password.map((error, index) => (
                            <p key={index} className="text-sm text-destructive">{error}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={(e) => handlePasswordFormChange('confirm_password', e.target.value)}
                          placeholder="Confirm your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-sm text-destructive">{errors.confirm_password[0]}</p>
                      )}
                    </div>

                    {errors.non_field_errors && (
                      <div className="space-y-1">
                        {errors.non_field_errors.map((error, index) => (
                          <p key={index} className="text-sm text-destructive">{error}</p>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button type="submit" disabled={updating} className="flex-1 md:flex-none">
                        {updating ? 'Changing Password...' : 'Change Password'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetPasswordForm}
                        disabled={updating}
                        className="flex-1 md:flex-none"
                      >
                        Clear
                      </Button>
                    </div>
                  </form>

                  <Separator className="my-8" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Danger Zone</h3>
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                      <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Delete Account</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete_password">Confirm your password</Label>
              <Input
                id="delete_password"
                type="password"
                value={deleteForm.password}
                onChange={(e) => setDeleteForm({ password: e.target.value })}
                placeholder="Enter your password to confirm"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password[0]}</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || !deleteForm.password}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
