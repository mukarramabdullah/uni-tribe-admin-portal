"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Upload, X, Check, Shield, AlertTriangle } from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";

type FormData = {
  title: string;
  description: string;
  type: "lost-found" | "academic" | "event";
  imageUrl?: string;
};

type VerificationResult = {
  isAuthentic: boolean;
  confidenceScore: number;
  reason: string;
  imageAnalysis?: {
    isAppropriate: boolean;
    isRelevant: boolean;
    description: string;
    confidence: number;
  };
};

const TestContentUpload: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setVerificationResult(null);

      const payload = {
        topic: data.type,
        content: data.description,
        title: data.title,
        imageUrl: previewImage,
      };

      const response = await fetch("/api/content-moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Content moderation failed");
      }

      const result = await response.json();
      setVerificationResult(result);
      if (result.isAuthentic) {
        toast.success("Content verified and approved!");
      } else {
        toast.error("Content flagged by moderation system.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit content for verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Content Verification Test
        </h1>
        <p className="text-gray-600">
          Upload content to test the AI moderation system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-blue-600" />
            Submit Content
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                {...register("type", { required: "Type is required" })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="lost-found">Lost & Found</option>
                <option value="academic">Academic Resource</option>
                <option value="event">Campus Event</option>
              </select>
              {errors.type && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                {...register("title", {
                  required: "Title is required",
                  minLength: {
                    value: 5,
                    message: "Title must be at least 5 characters",
                  },
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., Lost Blue Backpack in Library"
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register("description", {
                  required: "Description is required",
                  minLength: {
                    value: 20,
                    message: "Description must be at least 20 characters",
                  },
                })}
                rows={4}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Provide detailed description..."
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                <div className="space-y-1 text-center">
                  {previewImage ? (
                    <div className="relative">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="mx-auto h-48 object-contain rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : "Verify & Submit"}
            </button>
          </form>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              Verification Results
            </h2>

            {!verificationResult && !loading && (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <Shield className="h-12 w-12 mb-2 opacity-20" />
                <p>Submit content to see AI verification results</p>
              </div>
            )}

            {loading && (
              <div className="h-64 flex flex-col items-center justify-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-500 animate-pulse">
                  AI is analyzing content...
                </p>
              </div>
            )}

            {verificationResult && (
              <div
                className={`rounded-lg p-6 ${verificationResult.isAuthentic ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                <div className="flex items-start">
                  <div
                    className={`rounded-full p-2 ${verificationResult.isAuthentic ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                  >
                    {verificationResult.isAuthentic ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <AlertTriangle className="h-6 w-6" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3
                      className={`text-lg font-medium ${verificationResult.isAuthentic ? "text-green-900" : "text-red-900"}`}
                    >
                      {verificationResult.isAuthentic
                        ? "Content Approved"
                        : "Content Flagged"}
                    </h3>

                    <div className="mt-4 space-y-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Confidence Score
                        </span>
                        <div className="mt-1 flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className={`h-2 rounded-full ${verificationResult.isAuthentic ? "bg-green-500" : "bg-red-500"}`}
                              style={{
                                width: `${verificationResult.confidenceScore}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {verificationResult.confidenceScore}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          AI Analysis
                        </span>
                        <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                          {verificationResult.reason}
                        </p>
                      </div>

                      {verificationResult.imageAnalysis && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Image Analysis (Gemini AI)
                          </span>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div
                              className={`text-xs px-2 py-1 rounded flex items-center ${verificationResult.imageAnalysis.isAppropriate ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {verificationResult.imageAnalysis
                                .isAppropriate ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              Appropriate
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded flex items-center ${verificationResult.imageAnalysis.isRelevant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {verificationResult.imageAnalysis.isRelevant ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              Relevant
                            </div>
                          </div>
                          <p className="mt-2 text-xs italic text-gray-600">
                            &quot; {verificationResult.imageAnalysis.description} &quot;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Raw Response
                </h4>
                <pre className="text-xs overflow-auto bg-gray-800 text-green-400 p-3 rounded font-mono">
                  {JSON.stringify(verificationResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestContentUpload;
