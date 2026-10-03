using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildAndroid
{
    public static void Build()
    {
        var scenes = EditorBuildSettings.scenes
            .Where(scene => scene.enabled)
            .Select(scene => scene.path)
            .ToArray();

        if (scenes.Length == 0)
        {
            throw new InvalidOperationException("No enabled scenes are configured in EditorBuildSettings.");
        }

        var output = GetArgument("-buildPath") ?? "build/NgocRongLocal.apk";
        var absoluteOutput = Path.GetFullPath(output);
        Directory.CreateDirectory(Path.GetDirectoryName(absoluteOutput));

        var options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = absoluteOutput,
            target = BuildTarget.Android,
            options = BuildOptions.None
        };

        Debug.Log($"Building Android APK: {absoluteOutput}");
        Debug.Log($"Scenes: {string.Join(", ", scenes)}");

        var report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new Exception(
                $"Android build failed: {report.summary.result}; errors={report.summary.totalErrors}");
        }

        Debug.Log($"Android APK created: {absoluteOutput} ({report.summary.totalSize} bytes)");
    }

    private static string GetArgument(string name)
    {
        var args = Environment.GetCommandLineArgs();
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (args[i].Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                return args[i + 1];
            }
        }

        return null;
    }
}
