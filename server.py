from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
import httpx
import asyncio
import urllib.parse


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


async def handle_call_tool(ctx, params):
    if params.name == "get_weather":
        city = params.arguments.get("city", "").strip()
        if not city:
            return types.CallToolResult(
                content=[types.TextContent(
                    type="text",
                    text="Error: City name is required."
                )],
                isError=True
            )

        encoded_city = urllib.parse.quote(city)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://wttr.in/{encoded_city}?format=j1"
                )
                if response.status_code != 200:
                    return types.CallToolResult(
                        content=[types.TextContent(
                            type="text",
                            text=f"Error: Unable to fetch weather for '{city}' (Status {response.status_code})."
                        )],
                        isError=True
                    )

                data = response.json()
                current = data.get("current_condition", [{}])[0]
                temp = current.get("temp_C", "N/A")
                desc_list = current.get("weatherDesc", [{}])
                desc = desc_list[0].get("value", "Unknown") if desc_list else "Unknown"

                return types.CallToolResult(
                    content=[types.TextContent(
                        type="text",
                        text=f"{city} weather: {temp}°C, {desc}"
                    )]
                )
        except Exception as e:
            return types.CallToolResult(
                content=[types.TextContent(
                    type="text",
                    text=f"Error fetching weather for '{city}': {str(e)}"
                )],
                isError=True
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