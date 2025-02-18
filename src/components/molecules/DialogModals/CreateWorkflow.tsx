import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Label } from "@/components/atoms/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { AlertCircle, ChevronDown, Clock, Globe, Heading3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { useAuthenticatedAction } from "@/hooks/useAuth";
import { useWorkflow } from "@/hooks/useWorkflow";
import { x1Testnet } from "viem/chains";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/atoms/dropdown-menu";

// Time units in seconds
const TIME_UNITS = {
  minutes: 60,
  hours: 3600,
  days: 86400,
};

const MIN_INTERVAL = 60; // 1 minute in seconds
const MAX_INTERVAL = 86400; // 1 day in seconds

const schemas = ["m-schema-001", "m-schema-002"];

const CreateWorkflowDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { withAuth } = useAuthenticatedAction();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    executionInterval: 3600, // Default 1 hour in seconds
    schemaId: schemas[0],
  });

  const [intervalInput, setIntervalInput] = useState({
    value: "1",
    unit: "hours",
  });

  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit } = useWorkflow();

  // Convert interval to seconds and validate
  const validateInterval = (value: string, unit: keyof typeof TIME_UNITS) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return "Interval must be a positive number";
    }

    const totalSeconds = numValue * TIME_UNITS[unit];
    if (totalSeconds < MIN_INTERVAL) {
      return "Interval must be at least 1 minute";
    }
    if (totalSeconds > MAX_INTERVAL) {
      return "Interval cannot exceed 1 day";
    }
    return null;
  };

  const handleIntervalChange = (
    value: string | number,
    unit?: keyof typeof TIME_UNITS
  ) => {
    const newValue = typeof value === "string" ? value : intervalInput.value;
    const newUnit = unit || intervalInput.unit;

    setIntervalInput({
      value: newValue,
      unit: newUnit as keyof typeof TIME_UNITS,
    });

    const error = validateInterval(
      newValue,
      newUnit as keyof typeof TIME_UNITS
    );
    setErrors((prev: any) => ({ ...prev, interval: error }));

    if (!error) {
      const seconds =
        parseFloat(newValue) * TIME_UNITS[newUnit as keyof typeof TIME_UNITS];
      setFormData((prev) => ({
        ...prev,
        executionInterval: Math.floor(seconds),
      }));
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 50) {
      newErrors.title = "Title must be less than 50 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }

    const intervalError = validateInterval(
      intervalInput.value,
      intervalInput.unit as keyof typeof TIME_UNITS
    );
    if (intervalError) {
      newErrors.interval = intervalError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    await withAuth(async () => {
      setIsSubmitting(true);
    });
    try {
      // await onSubmit(formData);
      const x = await handleSubmit(formData);
      console.log(x);
    } catch (error: any) {
      console.log({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create workflow",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SchemaSelector = () => (
    <DropdownMenu>
      <Label htmlFor="title">
        Schema <span className="text-red-500">*</span>
      </Label>
      <DropdownMenuTrigger asChild>
        <button
          className="px-4 py-2 bg-gray-50 text-[#9a2529] rounded-lg
                     hover:bg-gray-50 transition-all duration-200
                     flex items-center space-x-2 group w-[160px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="font-medium truncate">{formData.schemaId}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px] bg-gray-50/95 backdrop-blur-sm border border-gray-50"
      >
        {schemas.map((schema, index) => (
          <DropdownMenuItem
            key={`${schema}-${index}`}
            onClick={(e) => setFormData({ ...formData, schemaId: schema })}
            className="text-[#9a2529] hover:text-white hover:bg-[#9a2529]
                     focus:text-white focus:bg-[#9a2529]"
          >
            {schema}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>

        <p className="text-sm">
          Set up your workflow details. All fields are required.
        </p>

        <form onSubmit={submitForm} className="space-y-6">
          <SchemaSelector />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter workflow title"
                className="w-full"
              />
              {errors.title && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.title}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-gray-500">
                {formData.title.length}/60 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your workflow"
                className="w-full min-h-[100px]"
              />
              {errors.description && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.description}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-gray-500">
                {formData.description.length}/250 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Execution Interval <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={intervalInput.value}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    placeholder="Enter interval"
                    className="w-full"
                  />
                </div>
                <Select
                  value={intervalInput.unit}
                  onValueChange={(value) =>
                    handleIntervalChange(
                      intervalInput.value,
                      value as keyof typeof TIME_UNITS
                    )
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.interval && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.interval}</AlertDescription>
                </Alert>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Interval must be between 1 minute and 1 day</span>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] text-white"
            >
              {isSubmitting ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkflowDialog;
