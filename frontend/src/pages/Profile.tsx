import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, Lock, Trash2, Eye, EyeOff } from 'lucide-react';
import { profileApi } from '@/services/profileApi';
import Header from '@/components/ui/header';

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
  
  // Profile state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    email: '',
    first_name: '',
    last_name: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Password visibility state
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Delete account state
  const [deleteForm, setDeleteForm] = useState({
    password: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState<ValidationErrors>({});
  
  // Form dirty state tracking
  const [isProfileFormDirty, setIsProfileFormDirty] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Load profile data on component mount
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrors({}); // Clear any previous errors
      const data = await profileApi.getProfile();
      setProfileData(data);
      setProfileForm({
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || ''
      });
      setIsProfileFormDirty(false);
    } catch (error: unknown) {
      console.error('Profile loading error:', error);
      // Handle specific error cases
      if ((error as { response?: { status?: number } })?.response?.status === 401) {
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'Please log in again to access your profile'
        });
        navigate('/');
      } else if (error.response?.status === 403) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to access this profile'
        });
      } else if (error.response?.status >= 500) {
        toast({
          variant: 'destructive',
          title: 'Server Error',
          description: 'Our servers are experiencing issues. Please try again later.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.error || 'Failed to load profile information'
        });
      }
    } finally {
      setLoading(false);
    }
  };


  const validateProfileForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate email
    if (!profileForm.email.trim()) {
      newErrors.email = ['Email is required'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      newErrors.email = ['Please enter a valid email address'];
    }
    
    // Validate first name
    if (profileForm.first_name && profileForm.first_name.length > 150) {
      newErrors.first_name = ['First name cannot exceed 150 characters'];
    }
    
    // Validate last name
    if (profileForm.last_name && profileForm.last_name.length > 150) {
      newErrors.last_name = ['Last name cannot exceed 150 characters'];
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Client-side validation
    if (!validateProfileForm()) {
      return;
    }
    
    setUpdating(true);

    try {
      
      // Step 1: Update Django backend
      const response = await profileApi.updateProfile(profileForm);
      
      // Step 2: Update Supabase user metadata (if user is authenticated via Supabase)
      if (user) {
        try {
          const supabaseResult = await updateUserProfile({
            email: profileForm.email,
            first_name: profileForm.first_name,
            last_name: profileForm.last_name
          }, false); // Disable toast from AuthContext
          
          if (supabaseResult.error) {
            // Show warning but don't fail the entire operation
            toast({
              variant: 'default',
              title: 'Partial Success',
              description: 'Profile updated in system, but Supabase sync had issues. Changes may take time to reflect.'
            });
          } else {
            // Force refresh the session to get updated user data
            await refreshSession();
          }
        } catch (supabaseError: unknown) {
          // Don't fail the entire operation if Supabase update fails
          console.warn('Supabase profile update failed:', supabaseError);
        }
      } else {
        console.warn('No profile data returned from update');
      }
      
      // Update local state with the returned profile data
      if (response.profile) {
        setProfileData(response.profile);
        setProfileForm({
          email: response.profile.email || '',
          first_name: response.profile.first_name || '',
          last_name: response.profile.last_name || ''
        });
        setIsProfileFormDirty(false);
      }
      
      toast({
        title: 'Success',
        description: response.message || 'Profile updated successfully'
      });
    } catch (error: unknown) {
      if ((error as { response?: { data?: { errors?: ValidationErrors } } })?.response?.data?.errors) {
        setErrors((error as { response: { data: { errors: ValidationErrors } } }).response.data.errors);
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
    
    // Validate current password
    if (!passwordForm.current_password) {
      newErrors.current_password = ['Current password is required'];
    }
    
    // Validate new password
    if (!passwordForm.new_password) {
      newErrors.new_password = ['New password is required'];
    } else if (passwordForm.new_password.length < 8) {
      newErrors.new_password = ['Password must be at least 8 characters long'];
    }
    
    // Validate password confirmation
    if (!passwordForm.confirm_password) {
      newErrors.confirm_password = ['Please confirm your new password'];
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      newErrors.confirm_password = ['Passwords do not match'];
    }
    
    // Check if new password is same as current
    if (passwordForm.current_password && passwordForm.new_password && 
        passwordForm.current_password === passwordForm.new_password) {
      newErrors.new_password = ['New password must be different from current password'];
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Client-side validation
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
      if ((error as { response?: { data?: { errors?: ValidationErrors } } })?.response?.data?.errors) {
        setErrors((error as { response: { data: { errors: ValidationErrors } } }).response.data.errors);
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
        // Account successfully deleted
        toast({
          title: 'Account Deleted',
          description: response.message
        });
        
        // Sign out and redirect
        await signOut();
        navigate('/');
      } else if (response.support_needed) {
        // Partial deletion - show warning and contact support message
        toast({
          variant: 'destructive',
          title: 'Partial Account Deletion',
          description: response.message,
          duration: 10000 // Show longer for important message
        });
        
        // Still sign out user since their data is gone
        await signOut();
        navigate('/');
      } else {
        // Other failure scenarios
        toast({
          variant: 'destructive',
          title: 'Account Deletion Failed',
          description: response.message || 'Failed to delete account completely'
        });
      }
    } catch (error: unknown) {
      console.error('Account deletion error:', error);
      if ((error as { response?: { data?: { errors?: ValidationErrors } } })?.response?.data?.errors) {
        setErrors((error as { response: { data: { errors: ValidationErrors } } }).response.data.errors);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to delete account. Please try again or contact support.'
        });
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const resetProfileForm = () => {
    if (profileData) {
      setProfileForm({
        email: profileData.email || '',
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || ''
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

  const handleProfileFormChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setIsProfileFormDirty(true);
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordFormChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and security settings</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="danger" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Danger Zone
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and email address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={profileForm.first_name}
                          onChange={(e) => handleProfileFormChange('first_name', e.target.value)}
                          placeholder="Enter your first name"
                        />
                        {errors.first_name && (
                          <p className="text-sm text-red-600">{errors.first_name[0]}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={profileForm.last_name}
                          onChange={(e) => handleProfileFormChange('last_name', e.target.value)}
                          placeholder="Enter your last name"
                        />
                        {errors.last_name && (
                          <p className="text-sm text-red-600">{errors.last_name[0]}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => handleProfileFormChange('email', e.target.value)}
                        placeholder="Enter your email address"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email[0]}</p>
                      )}
                    </div>

                    {profileData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                          <p className="text-sm text-gray-900">
                            {profileData.date_joined 
                              ? new Date(profileData.date_joined).toLocaleDateString()
                              : 'Not available'
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                          <p className="text-sm text-gray-900">
                            {profileData.last_login 
                              ? new Date(profileData.last_login).toLocaleDateString()
                              : 'Never'
                            }
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

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showPasswords.current ? "text" : "password"}
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
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.current_password && (
                        <p className="text-sm text-red-600">{errors.current_password[0]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showPasswords.new ? "text" : "password"}
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
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.new_password && (
                        <div className="space-y-1">
                          {errors.new_password.map((error, index) => (
                            <p key={index} className="text-sm text-red-600">{error}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showPasswords.confirm ? "text" : "password"}
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
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-sm text-red-600">{errors.confirm_password[0]}</p>
                      )}
                    </div>

                    {errors.non_field_errors && (
                      <div className="space-y-1">
                        {errors.non_field_errors.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">{error}</p>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                      <p className="text-sm text-red-700 mb-4">
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
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

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
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
                <p className="text-sm text-red-600">{errors.password[0]}</p>
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