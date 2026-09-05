from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
import httpx
import asyncio


async def handle_list_tools(ctx, params):
    return types.ListToolsResult(
        tools=[
            types.Tool(
                name="get_weather",
                description="Get weather for any city",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "City name"
                        }
                    },
                    "required": ["city"]
                }
            )
        ]
    )


import urllib.parse


async def handle_call_tool(ctx, params):
    if params.name == "get_weather":
        city = params.arguments["city"]
        encoded_city = urllib.parse.quote(city)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://wttr.in/{encoded_city}?format=j1"
            )
            data = response.json()
            temp = data["current_condition"][0]["temp_C"]
            desc = data["current_condition"][0]["weatherDesc"][0]["value"]
            return types.CallToolResult(
                content=[types.TextContent(
                    type="text",
                    text=f"{city} weather: {temp}°C, {desc}"
                )]
            )


app = Server(
    "automcp-demo",
    on_list_tools=handle_list_tools,
    on_call_tool=handle_call_tool,
)


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())