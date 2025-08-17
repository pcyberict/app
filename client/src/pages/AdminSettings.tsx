import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Save, Plus, Eye, EyeOff, CreditCard, Wallet, Settings, Globe, Wrench } from "lucide-react";
import { SiBinance } from "react-icons/si";
import { FaBitcoin } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string;
  category: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentProvider {
  id: string;
  provider: string;
  displayName: string;
  isEnabled: boolean;
  sortOrder: number;
  apiSettings: any;
  uiConfig: any;
  createdAt: string;
  updatedAt: string;
}

interface WebsiteConfig {
  id: string;
  siteName: string | null;
  siteDescription: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  defaultCoinsBalance: number | null;
  welcomeBonusAmount: number | null;
  referralBonusAmount: number | null;
  minWatchSeconds: number | null;
  maxWatchSeconds: number | null;
  maintenanceMode: boolean | null;
  maintenanceMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSetting, setNewSetting] = useState({
    key: "",
    value: "",
    type: "string",
    description: "",
    category: "general"
  });
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const { data: settings = [], isLoading } = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/settings"],
    enabled: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (setting: Partial<SystemSetting>) => {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      if (!response.ok) throw new Error("Failed to save setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Setting saved successfully",
      });
      setNewSetting({ key: "", value: "", type: "string", description: "", category: "general" });
      setEditingSetting(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save setting",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Setting deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete setting",
        variant: "destructive",
      });
    },
  });

  const handleSave = (setting: Partial<SystemSetting>) => {
    saveMutation.mutate(setting);
  };

  const handleDelete = (key: string) => {
    if (confirm(`Are you sure you want to delete the setting "${key}"?`)) {
      deleteMutation.mutate(key);
    }
  };

  const toggleShowValue = (settingId: string) => {
    setShowValues(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const categorizedSettings = settings.reduce((acc: Record<string, SystemSetting[]>, setting: SystemSetting) => {
    const category = setting.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {});

  const isValueSensitive = (key: string) => {
    return key.toLowerCase().includes('key') || 
           key.toLowerCase().includes('secret') || 
           key.toLowerCase().includes('password') ||
           key.toLowerCase().includes('token');
  };

  // Payment-related settings helper
  const paymentSettings = [
    { key: 'STRIPE_PUBLIC_KEY', label: 'Stripe Public Key', category: 'payment', type: 'string', description: 'Stripe publishable key for card payments' },
    { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', category: 'payment', type: 'secret', description: 'Stripe secret key for processing payments' },
    { key: 'PAYPAL_CLIENT_ID', label: 'PayPal Client ID', category: 'payment', type: 'string', description: 'PayPal client ID for PayPal payments' },
    { key: 'PAYPAL_CLIENT_SECRET', label: 'PayPal Client Secret', category: 'payment', type: 'secret', description: 'PayPal client secret' },
    { key: 'BINANCE_PAY_API_KEY', label: 'Binance Pay API Key', category: 'payment', type: 'secret', description: 'Binance Pay API key for crypto payments' },
    { key: 'BINANCE_PAY_SECRET', label: 'Binance Pay Secret', category: 'payment', type: 'secret', description: 'Binance Pay secret key' },
  ];

  const quickAddPaymentSetting = (settingTemplate: any) => {
    setNewSetting({
      key: settingTemplate.key,
      value: '',
      type: settingTemplate.type,
      description: settingTemplate.description,
      category: settingTemplate.category
    });
  };

  // Website Configuration Tab Component
  function WebsiteConfigTab() {
    const { data: config, isLoading: configLoading } = useQuery<WebsiteConfig>({
      queryKey: ["/api/admin/website-config"],
    });

    const [editingConfig, setEditingConfig] = useState<Partial<WebsiteConfig>>({});
    const [formValues, setFormValues] = useState<Partial<WebsiteConfig>>({});

    // Initialize form values when config is loaded
    useEffect(() => {
      if (config) {
        setFormValues({
          siteName: config.siteName || '',
          siteDescription: config.siteDescription || '',
          siteUrl: config.siteUrl || '',
          logoUrl: config.logoUrl || '',
          faviconUrl: config.faviconUrl || '',
          defaultCoinsBalance: config.defaultCoinsBalance || 0,
          welcomeBonusAmount: config.welcomeBonusAmount || 0,
          referralBonusAmount: config.referralBonusAmount || 0,
          minWatchSeconds: config.minWatchSeconds || 0,
          maxWatchSeconds: config.maxWatchSeconds || 0,
          maintenanceMessage: config.maintenanceMessage || '',
        });
      }
    }, [config]);

    const updateConfigMutation = useMutation({
      mutationFn: async (updates: Partial<WebsiteConfig>) => {
        const response = await fetch("/api/admin/website-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error("Failed to update website config");
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/website-config"] });
        queryClient.invalidateQueries({ queryKey: ["/api/website-config/maintenance"] });
        toast({
          title: "Success",
          description: "Website configuration updated successfully",
        });
        setEditingConfig({});
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update website config",
          variant: "destructive",
        });
      },
    });

    const handleUpdateConfig = (updates: Partial<WebsiteConfig>) => {
      updateConfigMutation.mutate(updates);
    };

    const handleFieldChange = (key: string, value: any) => {
      const newValue = { [key]: value };
      setFormValues({ ...formValues, ...newValue });
      setEditingConfig({ ...editingConfig, ...newValue });
    };

    const handleSaveChanges = () => {
      if (Object.keys(editingConfig).length > 0) {
        handleUpdateConfig(editingConfig);
      }
    };

    if (configLoading) {
      return <div className="p-6">Loading website configuration...</div>;
    }

    const configFields = [
      { key: 'siteName', label: 'Site Name', type: 'text', description: 'The name of your website' },
      { key: 'siteDescription', label: 'Site Description', type: 'textarea', description: 'A brief description of your website' },
      { key: 'siteUrl', label: 'Site URL', type: 'text', description: 'The main URL of your website' },
      { key: 'logoUrl', label: 'Logo URL', type: 'text', description: 'URL to your website logo' },
      { key: 'faviconUrl', label: 'Favicon URL', type: 'text', description: 'URL to your website favicon' },
      { key: 'defaultCoinsBalance', label: 'Default Coin Balance', type: 'number', description: 'Default coins given to new users' },
      { key: 'welcomeBonusAmount', label: 'Welcome Bonus', type: 'number', description: 'Bonus coins for new user registration' },
      { key: 'referralBonusAmount', label: 'Referral Bonus', type: 'number', description: 'Bonus coins for successful referrals' },
      { key: 'minWatchSeconds', label: 'Min Watch Seconds', type: 'number', description: 'Minimum seconds users must watch videos' },
      { key: 'maxWatchSeconds', label: 'Max Watch Seconds', type: 'number', description: 'Maximum seconds users can request for videos' },
    ];

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Website Configuration
          </h2>
          <p className="text-muted-foreground">
            Manage global website settings, branding, and default values.
          </p>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {configFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.key}
                        className="w-full p-2 border rounded-md min-h-[80px] dark:bg-gray-800 dark:border-gray-600"
                        value={formValues[field.key as keyof WebsiteConfig] as string || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        data-testid={`input-${field.key}`}
                      />
                    ) : (
                      <Input
                        id={field.key}
                        type={field.type}
                        value={formValues[field.key as keyof WebsiteConfig] as string | number || ''}
                        onChange={(e) => {
                          const value = field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
                          handleFieldChange(field.key, value);
                        }}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        data-testid={`input-${field.key}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Wrench className="h-5 w-5" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">Enable Maintenance Mode</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    When enabled, only admins can access the site. Regular users will see a maintenance page.
                  </p>
                </div>
                <Switch
                  checked={config?.maintenanceMode || false}
                  onCheckedChange={(checked) => handleUpdateConfig({ maintenanceMode: checked })}
                  disabled={updateConfigMutation.isPending}
                  data-testid="switch-maintenance-mode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                <textarea
                  id="maintenanceMessage"
                  className="w-full p-2 border rounded-md min-h-[100px] dark:bg-gray-800 dark:border-gray-600"
                  value={formValues.maintenanceMessage || ''}
                  onChange={(e) => handleFieldChange('maintenanceMessage', e.target.value)}
                  placeholder="Enter message to display during maintenance..."
                  data-testid="textarea-maintenance-message"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Changes Button */}
          {Object.keys(editingConfig).length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Unsaved Changes</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      You have unsaved changes to the website configuration.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingConfig({})}
                      disabled={updateConfigMutation.isPending}
                      data-testid="button-cancel-config"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={updateConfigMutation.isPending}
                      data-testid="button-save-config"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Payment Providers Tab Component
  function PaymentProvidersTab() {
    const { data: providers = [], isLoading: providersLoading } = useQuery<PaymentProvider[]>({
      queryKey: ["/api/admin/payment-providers"],
    });

    const toggleProviderMutation = useMutation({
      mutationFn: async ({ provider, enabled }: { provider: string; enabled: boolean }) => {
        const response = await fetch(`/api/admin/payment-providers/${provider}/enabled`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        if (!response.ok) throw new Error("Failed to update provider");
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-providers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/payment-providers/enabled"] });
        toast({
          title: "Success",
          description: "Payment provider updated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update provider",
          variant: "destructive",
        });
      },
    });

    const handleToggleProvider = (provider: string, enabled: boolean) => {
      toggleProviderMutation.mutate({ provider, enabled });
    };

    const getProviderIcon = (provider: string) => {
      switch (provider) {
        case 'stripe': return <CreditCard className="h-6 w-6 text-blue-600" />;
        case 'paypal': return <Wallet className="h-6 w-6 text-blue-500" />;
        case 'binance_pay': return <SiBinance className="h-6 w-6 text-yellow-600" />;
        case 'cryptomus': return <FaBitcoin className="h-6 w-6 text-orange-500" />;
        default: return <Settings className="h-6 w-6 text-gray-600" />;
      }
    };

    if (providersLoading) {
      return <div className="p-6">Loading payment providers...</div>;
    }

    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Payment Provider Management</h2>
          <p className="text-muted-foreground">
            Enable or disable payment methods available to users on the buy coins page.
          </p>
        </div>

        <div className="grid gap-4">
          {providers.map((provider) => (
            <Card key={provider.provider} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getProviderIcon(provider.provider)}
                    <div>
                      <h3 className="text-lg font-semibold">{provider.displayName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {provider.provider === 'stripe' && 'Credit and debit card payments'}
                        {provider.provider === 'paypal' && 'PayPal wallet payments'}
                        {provider.provider === 'binance_pay' && 'Cryptocurrency payments via Binance Pay'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge variant={provider.isEnabled ? "default" : "secondary"}>
                      {provider.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={provider.isEnabled}
                      onCheckedChange={(enabled) => handleToggleProvider(provider.provider, enabled)}
                      disabled={toggleProviderMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Configuration Note</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Payment providers require proper API configuration in the Payment tab. 
                  Enabled providers will appear on the buy coins page for users to select.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <Badge variant="outline">Admin Access</Badge>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="api" data-testid="tab-api">API Keys</TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="website" data-testid="tab-website">Website</TabsTrigger>
          <TabsTrigger value="payment" data-testid="tab-payment">Payment</TabsTrigger>
          <TabsTrigger value="providers" data-testid="tab-providers">Providers</TabsTrigger>
          <TabsTrigger value="add" data-testid="tab-add">Add New</TabsTrigger>
        </TabsList>

        {Object.entries(categorizedSettings).map(([category, categorySettings]: [string, SystemSetting[]]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid gap-4">
              {categorySettings.map((setting) => (
                <Card key={setting.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{setting.key}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowValue(setting.id)}
                          data-testid={`button-toggle-value-${setting.key}`}
                        >
                          {showValues[setting.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSetting(setting)}
                          data-testid={`button-edit-${setting.key}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(setting.key)}
                          data-testid={`button-delete-${setting.key}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                    <div className="space-y-2">
                      <Label>Value:</Label>
                      <div className="font-mono text-sm p-2 bg-muted rounded">
                        {showValues[setting.id] || !isValueSensitive(setting.key) 
                          ? setting.value 
                          : '••••••••••••••••'
                        }
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Type: {setting.type}</span>
                      <span>Updated: {new Date(setting.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="add" className="space-y-4">
          {/* Quick Add Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Add Payment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentSettings.map((setting) => (
                  <Button
                    key={setting.key}
                    variant="outline"
                    className="p-4 h-auto flex flex-col items-start"
                    onClick={() => quickAddPaymentSetting(setting)}
                  >
                    <span className="font-medium">{setting.label}</span>
                    <span className="text-sm text-muted-foreground text-left">{setting.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Setting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    value={newSetting.key}
                    onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                    placeholder="setting_key"
                    data-testid="input-new-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={newSetting.category}
                    onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    data-testid="select-new-category"
                  >
                    <option value="general">General</option>
                    <option value="api">API</option>
                    <option value="payment">Payment</option>
                    <option value="database">Database</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  placeholder="Setting value"
                  data-testid="input-new-value"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  placeholder="Setting description"
                  data-testid="input-new-description"
                />
              </div>
              <Button 
                onClick={() => handleSave(newSetting)} 
                disabled={!newSetting.key || !newSetting.value}
                data-testid="button-save-new"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Setting
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Website Configuration Tab */}
        <TabsContent value="website" className="space-y-4">
          <WebsiteConfigTab />
        </TabsContent>

        {/* Payment Providers Management Tab */}
        <TabsContent value="providers" className="space-y-4">
          <PaymentProvidersTab />
        </TabsContent>
      </Tabs>

      {editingSetting && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle>Edit Setting: {editingSetting.key}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                value={editingSetting.value}
                onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                data-testid="input-edit-value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editingSetting.description}
                onChange={(e) => setEditingSetting({ ...editingSetting, description: e.target.value })}
                data-testid="input-edit-description"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSave(editingSetting)}
                data-testid="button-save-edit"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditingSetting(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}