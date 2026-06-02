
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, BookOpen, ExternalLink, SplitIcon, FilePlayIcon } from "lucide-react";
import { StudioConfig } from "@/microfox.config";
import { DisclaimerBanner } from "@/components/disclaimer-banner";


const Libraries = [{
  name: "Data Motion",
  description: "Data Motion is a library for creating and rendering videos with @microfox/datamotion which is built on top of remotion.",
  url: "https://github.com/microfox-app/datamotion",
  icon: <FilePlayIcon className="w-4 h-4" />
}, {
  name: "Remotion",
  description: "Remotion is a library for creating and rendering videos with remotion.",
  url: "https://github.com/remotion-dev/remotion",
  icon: "https://github.com/remotion-dev/brand/raw/main/withouttitle/element-0.png",
}, {
  name: "Ai Router",
  description: "Ai Router is a library for creating and rendering videos with @microfox/ai-router which is built on top of remotion.",
  url: "https://github.com/microfox-app/ai-router",
  icon: <SplitIcon className="w-4 h-4" />
}]

export default function Homepage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container flex flex-col items-center justify-between min-h-screen mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <DisclaimerBanner />
        <div className="text-center my-16">
          <h1 className=" text-5xl font-bold tracking-tight mb-6">
            {StudioConfig.appName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {StudioConfig.appDescription}
          </p>
        </div>

        {/* Main Content Card */}
        {/* <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">What is AI Router?</CardTitle>
            <CardDescription className="text-base">
              Powerful framework for building sophisticated AI systems
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              AI Router is a powerful framework that enables you to build sophisticated, 
              multi-agent AI systems with ease. Inspired by Express.js simplicity and 
              Google's Agent Development Kit approach, it provides a seamless integration 
              with Next.js and Vercel's AI SDK.
            </p>
            <p className="text-muted-foreground">
              Whether you're building conversational AI, research agents, or complex 
              orchestration systems, AI Router gives you the tools to create robust, 
              scalable AI applications.
            </p>
          </CardContent>
        </Card> */}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button asChild size="lg">
            <Link href="/projects">
              <Zap className="w-4 h-4 mr-2" />
              Enter App
            </Link>
          </Button>
          {/* <Button asChild size="lg">
            <Link href="/studio">
              <Zap className="w-4 h-4 mr-2" />
              Try in Chat Studio
            </Link>
          </Button> */}
        </div>


        <div className="mt-auto text-center flex flex-col gap-6 items-center justify-center mb-6">
          <div className="w-full max-w-2xl">
            <Tabs defaultValue={Libraries[0].name.toLowerCase().replace(/\s+/g, '-')} className="w-full">
              <div className="flex flex-row gap-2 items-center justify-center">
                <p className="text-sm text-muted-foreground ">Built with</p>
                <TabsList className={`grid grid-cols-${Libraries.length}`}>
                  {Libraries.map((library) => (
                    <TabsTrigger
                      key={library.name}
                      value={library.name.toLowerCase().replace(/\s+/g, '-')}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {typeof library.icon === 'string' ? <img src={library.icon} alt={library.name} className="w-4 h-4" /> : library.icon}
                      {library.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {Libraries.map((library) => (
                <TabsContent
                  key={library.name}
                  value={library.name.toLowerCase().replace(/\s+/g, '-')}
                  className="mt-4"
                >
                  <p className="text-sm text-muted-foreground">{library.description}</p>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* Documentation Links Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Essential resources to get started with AI Router
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Getting Started</h4>
                <div className="space-y-2">
                  <Button asChild variant="ghost" className="justify-start h-auto p-2">
                    <Link 
                      href="https://docs.microfox.app/ai-router/intro" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-left"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Introduction
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start h-auto p-2">
                    <Link 
                      href="https://docs.microfox.app/ai-router/overview/quickstart" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-left"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Quickstart Guide
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start h-auto p-2">
                    <Link 
                      href="https://docs.microfox.app/ai-router/overview/ai-router" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-left"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Core Concepts
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Advanced Topics</h4>
                <div className="space-y-2">
                  <Button asChild variant="ghost" className="justify-start h-auto p-2">
                    <Link 
                      href="https://docs.microfox.app/ai-router/foundation/agents" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-left"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Building Agents
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start h-auto p-2">
                    <Link 
                      href="https://docs.microfox.app/ai-router/examples/perplexity-clone" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-left"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Examples
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start h-auto p-2">
                    <Link 
                      href="https://docs.microfox.app/ai-router/api-reference/router" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-left"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      API Reference
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Footer */}
        <div className="text-center mt-12 text-muted-foreground">
          <p>Built with ❤️ by the Microfox team</p>
        </div>
      </div>
    </div>
  );
}
