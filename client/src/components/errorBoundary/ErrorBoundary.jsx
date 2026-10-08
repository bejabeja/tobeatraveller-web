import { Component } from "react";
import Error from "../../pages/error/Error";

// A page that fails to draw would otherwise leave the whole app blank with no way out.
// Keyed by the address, so moving to another page tries again.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("A page failed to render", error);
  }

  retry = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) return <Error onRetry={this.retry} />;
    return this.props.children;
  }
}

export default ErrorBoundary;
